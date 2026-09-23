import prisma from "../lib/prisma.js";

/*
  ==========================================
  ADMIN FEES & PAYMENTS CONTROLLER
  ==========================================
*/

/* =========================================================
   HELPERS
   ========================================================= */

const VALID_STATUSES = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "OVERDUE",
];

const VALID_PAYMENT_METHODS = [
  "ONLINE",
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
];

const calculateFeeStatus = ({
  totalAmount,
  paidAmount,
  dueDate,
}) => {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);
  const due = new Date(dueDate);

  if (paid >= total && total > 0) {
    return "PAID";
  }

  if (dueDate && !Number.isNaN(due.getTime()) && due < new Date()) {
    return "OVERDUE";
  }

  if (paid > 0) {
    return "PARTIAL";
  }

  return "PENDING";
};

const formatFee = (fee) => {
  const totalAmount = Number(fee.totalAmount || 0);
  const paidAmount = Number(fee.paidAmount || 0);

  const pendingAmount = Math.max(
    0,
    totalAmount - paidAmount
  );

  const status = calculateFeeStatus({
    totalAmount,
    paidAmount,
    dueDate: fee.dueDate,
  });

  return {
    ...fee,
    totalAmount,
    paidAmount,
    pendingAmount,
    status,
  };
};

const parsePositiveInteger = (value) => {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};

/* =========================================================
   GET ALL FEES
   GET /api/admin/fees
   ========================================================= */

export const getAdminFees = async (req, res) => {
  try {
    const { search, status } = req.query;

    const where = {};

    if (search) {
      const searchText = String(search).trim();

      if (searchText) {
        where.OR = [
          {
            title: {
              contains: searchText,
              mode: "insensitive",
            },
          },
          {
            student: {
              enrollmentNumber: {
                contains: searchText,
                mode: "insensitive",
              },
            },
          },
          {
            student: {
              user: {
                firstName: {
                  contains: searchText,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            student: {
              user: {
                lastName: {
                  contains: searchText,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            student: {
              user: {
                email: {
                  contains: searchText,
                  mode: "insensitive",
                },
              },
            },
          },
        ];
      }
    }

    const fees = await prisma.fee.findMany({
      where,

      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
              },
            },

            departmentRel: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            programRel: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },

        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },

      orderBy: {
        dueDate: "asc",
      },
    });

    let formattedFees = fees.map(formatFee);

    /*
      Status is calculated dynamically so overdue fees
      are detected even when the database still contains
      PENDING or PARTIAL.
    */
    if (status) {
      const requestedStatus =
        String(status).trim().toUpperCase();

      if (!VALID_STATUSES.includes(requestedStatus)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid fee status. Allowed values: PENDING, PARTIAL, PAID, OVERDUE",
        });
      }

      formattedFees = formattedFees.filter(
        (fee) => fee.status === requestedStatus
      );
    }

    return res.status(200).json({
      success: true,
      message: "Fees fetched successfully",
      count: formattedFees.length,
      fees: formattedFees,
    });
  } catch (error) {
    console.error("Get admin fees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fees",
      error: error.message,
    });
  }
};

/* =========================================================
   GET FEE BY ID
   GET /api/admin/fees/:id
   ========================================================= */

export const getAdminFeeById = async (req, res) => {
  try {
    const feeId = parsePositiveInteger(
      req.params.id
    );

    if (!feeId) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee ID",
      });
    }

    const fee = await prisma.fee.findUnique({
      where: {
        id: feeId,
      },

      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isActive: true,
              },
            },

            departmentRel: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            programRel: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },

        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
      },
    });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Fee details fetched successfully",
      fee: formatFee(fee),
    });
  } catch (error) {
    console.error(
      "Get admin fee by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee details",
      error: error.message,
    });
  }
};

/* =========================================================
   CREATE FEE
   POST /api/admin/fees
   ========================================================= */

export const createAdminFee = async (req, res) => {
  try {
    const {
      studentId,
      title,
      totalAmount,
      dueDate,
    } = req.body;

    if (
      !studentId ||
      !title ||
      totalAmount === undefined ||
      !dueDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "studentId, title, totalAmount and dueDate are required",
      });
    }

    const parsedStudentId = Number(studentId);
    const parsedTotalAmount = Number(totalAmount);
    const trimmedTitle = String(title).trim();

    if (
      !Number.isInteger(parsedStudentId) ||
      parsedStudentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId",
      });
    }

    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: "Fee title cannot be empty",
      });
    }

    if (
      !Number.isFinite(parsedTotalAmount) ||
      parsedTotalAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "totalAmount must be a valid number greater than zero",
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (
      Number.isNaN(parsedDueDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
    }

    const student =
      await prisma.student.findUnique({
        where: {
          id: parsedStudentId,
        },
      });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const roundedAmount =
      Math.round(parsedTotalAmount);

    const initialStatus = calculateFeeStatus({
      totalAmount: roundedAmount,
      paidAmount: 0,
      dueDate: parsedDueDate,
    });

    const fee = await prisma.fee.create({
      data: {
        studentId: parsedStudentId,
        title: trimmedTitle,
        totalAmount: roundedAmount,
        paidAmount: 0,
        dueDate: parsedDueDate,
        status: initialStatus,
      },

      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },

        payments: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Fee created successfully",
      fee: formatFee(fee),
    });
  } catch (error) {
    console.error(
      "Create admin fee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create fee",
      error: error.message,
    });
  }
};

/* =========================================================
   UPDATE FEE
   PATCH /api/admin/fees/:id
   ========================================================= */

export const updateAdminFee = async (req, res) => {
  try {
    const feeId = parsePositiveInteger(
      req.params.id
    );

    if (!feeId) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee ID",
      });
    }

    const existingFee =
      await prisma.fee.findUnique({
        where: {
          id: feeId,
        },
      });

    if (!existingFee) {
      return res.status(404).json({
        success: false,
        message: "Fee record not found",
      });
    }

    const {
      title,
      totalAmount,
      dueDate,
    } = req.body;

    const data = {};

    if (title !== undefined) {
      const trimmedTitle =
        String(title).trim();

      if (!trimmedTitle) {
        return res.status(400).json({
          success: false,
          message:
            "Fee title cannot be empty",
        });
      }

      data.title = trimmedTitle;
    }

    let finalTotalAmount =
      Number(existingFee.totalAmount);

    let finalDueDate =
      existingFee.dueDate;

    if (totalAmount !== undefined) {
      const parsedTotalAmount =
        Number(totalAmount);

      if (
        !Number.isFinite(parsedTotalAmount) ||
        parsedTotalAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "totalAmount must be a valid number greater than zero",
        });
      }

      if (
        parsedTotalAmount <
        Number(existingFee.paidAmount)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Total amount cannot be less than the amount already paid",
        });
      }

      finalTotalAmount =
        Math.round(parsedTotalAmount);

      data.totalAmount =
        finalTotalAmount;
    }

    if (dueDate !== undefined) {
      const parsedDate =
        new Date(dueDate);

      if (
        Number.isNaN(parsedDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
      }

      finalDueDate = parsedDate;
      data.dueDate = parsedDate;
    }

    /*
      Status is calculated from actual payment
      and due date instead of trusting a manually
      supplied status from the frontend.
    */
    data.status = calculateFeeStatus({
      totalAmount: finalTotalAmount,
      paidAmount: Number(
        existingFee.paidAmount
      ),
      dueDate: finalDueDate,
    });

    const updatedFee =
      await prisma.fee.update({
        where: {
          id: feeId,
        },

        data,

        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },

          payments: {
            orderBy: {
              paymentDate: "desc",
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message: "Fee updated successfully",
      fee: formatFee(updatedFee),
    });
  } catch (error) {
    console.error(
      "Update admin fee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update fee",
      error: error.message,
    });
  }
};

/* =========================================================
   ADD PAYMENT
   POST /api/admin/fees/:id/payments
   ========================================================= */

export const createAdminFeePayment =
  async (req, res) => {
    try {
      const feeId = parsePositiveInteger(
        req.params.id
      );

      if (!feeId) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee ID",
        });
      }

      const {
        amount,
        paymentMethod,
        transactionId,
        paymentDate,
      } = req.body;

      if (
        amount === undefined ||
        !paymentMethod ||
        !transactionId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "amount, paymentMethod and transactionId are required",
        });
      }

      const parsedAmount = Number(amount);

      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than zero",
        });
      }

      const normalizedPaymentMethod =
        String(paymentMethod)
          .trim()
          .toUpperCase();

      if (
        !VALID_PAYMENT_METHODS.includes(
          normalizedPaymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      const normalizedTransactionId =
        String(transactionId).trim();

      if (!normalizedTransactionId) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction ID cannot be empty",
        });
      }

      let parsedPaymentDate = null;

      if (paymentDate) {
        parsedPaymentDate =
          new Date(paymentDate);

        if (
          Number.isNaN(
            parsedPaymentDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid payment date",
          });
        }
      }

      const fee =
        await prisma.fee.findUnique({
          where: {
            id: feeId,
          },
        });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message: "Fee record not found",
        });
      }

      const totalAmount =
        Number(fee.totalAmount);

      const paidAmount =
        Number(fee.paidAmount);

      const pendingAmount =
        Math.max(
          0,
          totalAmount - paidAmount
        );

      const finalAmount =
        Math.round(parsedAmount);

      if (finalAmount > pendingAmount) {
        return res.status(400).json({
          success: false,
          message:
            `Payment cannot exceed pending amount of ₹${pendingAmount}`,
        });
      }

      const existingTransaction =
        await prisma.feePayment.findUnique({
          where: {
            transactionId:
              normalizedTransactionId,
          },
        });

      if (existingTransaction) {
        return res.status(409).json({
          success: false,
          message:
            "A payment with this transaction ID already exists",
        });
      }

      const result =
        await prisma.$transaction(
          async (tx) => {
            const payment =
              await tx.feePayment.create({
                data: {
                  feeId,
                  amount: finalAmount,

                  paymentMethod:
                    normalizedPaymentMethod,

                  transactionId:
                    normalizedTransactionId,

                  ...(parsedPaymentDate
                    ? {
                        paymentDate:
                          parsedPaymentDate,
                      }
                    : {}),
                },
              });

            const newPaidAmount =
              paidAmount + finalAmount;

            const newStatus =
              calculateFeeStatus({
                totalAmount,
                paidAmount:
                  newPaidAmount,
                dueDate: fee.dueDate,
              });

            const updatedFee =
              await tx.fee.update({
                where: {
                  id: feeId,
                },

                data: {
                  paidAmount:
                    newPaidAmount,
                  status: newStatus,
                },
              });

            return {
              payment,
              updatedFee,
            };
          }
        );

      return res.status(201).json({
        success: true,
        message:
          "Payment recorded successfully",

        payment: result.payment,

        fee: formatFee(
          result.updatedFee
        ),
      });
    } catch (error) {
      console.error(
        "Create admin fee payment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to record payment",
        error: error.message,
      });
    }
  };

/* =========================================================
   GET PAYMENTS FOR A FEE
   GET /api/admin/fees/:id/payments
   ========================================================= */

export const getAdminFeePayments =
  async (req, res) => {
    try {
      const feeId = parsePositiveInteger(
        req.params.id
      );

      if (!feeId) {
        return res.status(400).json({
          success: false,
          message: "Invalid fee ID",
        });
      }

      const fee =
        await prisma.fee.findUnique({
          where: {
            id: feeId,
          },

          select: {
            id: true,
            title: true,
            totalAmount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
          },
        });

      if (!fee) {
        return res.status(404).json({
          success: false,
          message:
            "Fee record not found",
        });
      }

      const payments =
        await prisma.feePayment.findMany({
          where: {
            feeId,
          },

          orderBy: {
            paymentDate: "desc",
          },
        });

      const formattedFee =
        formatFee(fee);

      return res.status(200).json({
        success: true,
        message:
          "Payments fetched successfully",

        fee: formattedFee,

        count: payments.length,

        payments,
      });
    } catch (error) {
      console.error(
        "Get admin fee payments error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch payments",
        error: error.message,
      });
    }
  };