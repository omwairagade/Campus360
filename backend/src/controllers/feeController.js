import crypto from "crypto";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import prisma from "../lib/prisma.js";

// ============================================================
// LOAD ENVIRONMENT
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// ============================================================
// RAZORPAY
// ============================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ============================================================
// HELPERS
// ============================================================

const isStudent = (req) => {
  return req.user?.role === "STUDENT";
};

const canManageFees = (req) => {
  return ["ADMIN", "FACULTY"].includes(req.user?.role);
};

const sendError = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

const parsePositiveInteger = (value) => {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

// ============================================================
// GET MY FEES - STUDENT
// GET /api/fees/my-fees
// ============================================================

export const getMyFees = async (req, res) => {
  try {
    if (!isStudent(req)) {
      return sendError(
        res,
        403,
        "Only students can access their fees."
      );
    }

    const userId = req.user.userId;

    const student = await prisma.student.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return sendError(
        res,
        404,
        "Student profile not found."
      );
    }

    const fees = await prisma.fee.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        payments: {
          orderBy: {
            paymentDate: "desc",
          },
        },
        feeStructure: {
          include: {
            department: true,
            program: true,
            academicYear: true,
            components: true,
          },
        },
      },
      orderBy: {
        dueDate: "desc",
      },
    });

    // --------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------

    const totalAmount = fees.reduce(
      (sum, fee) =>
        sum + Number(fee.totalAmount || 0),
      0
    );

    const paidAmount = fees.reduce(
      (sum, fee) =>
        sum + Number(fee.paidAmount || 0),
      0
    );

    const pendingAmount = Math.max(
      totalAmount - paidAmount,
      0
    );

    return res.status(200).json({
      success: true,

      fees,

      summary: {
        totalAmount,
        paidAmount,
        pendingAmount,
      },
    });
  } catch (error) {
    console.error(
      "Get my fees error:",
      error
    );

    return sendError(
      res,
      500,
      error.message ||
        "Failed to fetch fees."
    );
  }
};

// ============================================================
// GET FEE BY ID
// GET /api/fees/:id
// ============================================================

export const getFeeById = async (req, res) => {
  try {
    const feeId =
      parsePositiveInteger(
        req.params.id
      );

    if (!feeId) {
      return sendError(
        res,
        400,
        "Invalid fee ID."
      );
    }

    const fee =
      await prisma.fee.findUnique({
        where: {
          id: feeId,
        },
        include: {
          payments: {
            orderBy: {
              paymentDate: "desc",
            },
          },
          feeStructure: {
            include: {
              department: true,
              program: true,
              academicYear: true,
              components: true,
            },
          },
        },
      });

    if (!fee) {
      return sendError(
        res,
        404,
        "Fee record not found."
      );
    }

    // Students can only view their own fee
    if (isStudent(req)) {
      const student =
        await prisma.student.findUnique({
          where: {
            userId: req.user.userId,
          },
          select: {
            id: true,
          },
        });

      if (
        !student ||
        fee.studentId !== student.id
      ) {
        return sendError(
          res,
          403,
          "You cannot access this fee record."
        );
      }
    } else if (!canManageFees(req)) {
      return sendError(
        res,
        403,
        "Access denied."
      );
    }

    return res.status(200).json({
      success: true,
      fee,
    });
  } catch (error) {
    console.error(
      "Get fee by ID error:",
      error
    );

    return sendError(
      res,
      500,
      error.message ||
        "Failed to fetch fee."
    );
  }
};

// ============================================================
// CREATE FEE - ADMIN / FACULTY
// POST /api/fees
// ============================================================

export const createFee = async (req, res) => {
  try {
    if (!canManageFees(req)) {
      return sendError(
        res,
        403,
        "Only admin or faculty can create fee records."
      );
    }

    const {
      studentId,
      totalAmount,
      amount,
      title,
      description,
      dueDate,
      status,
      feeStructureId,
    } = req.body;

    const parsedStudentId =
      parsePositiveInteger(
        studentId
      );

    /*
     * Support both:
     * totalAmount - current schema
     * amount      - backward compatibility
     */

    const parsedAmount =
      totalAmount !== undefined
        ? Number(totalAmount)
        : Number(amount);

    if (!parsedStudentId) {
      return sendError(
        res,
        400,
        "Valid studentId is required."
      );
    }

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      return sendError(
        res,
        400,
        "Valid fee amount is required."
      );
    }

    const parsedDueDate =
      parseDate(dueDate);

    if (
      dueDate &&
      !parsedDueDate
    ) {
      return sendError(
        res,
        400,
        "Invalid due date."
      );
    }

    const student =
      await prisma.student.findUnique({
        where: {
          id: parsedStudentId,
        },
      });

    if (!student) {
      return sendError(
        res,
        404,
        "Student not found."
      );
    }

    let parsedFeeStructureId = null;

    if (
      feeStructureId !== undefined &&
      feeStructureId !== null &&
      feeStructureId !== ""
    ) {
      parsedFeeStructureId =
        parsePositiveInteger(
          feeStructureId
        );

      if (!parsedFeeStructureId) {
        return sendError(
          res,
          400,
          "Invalid fee structure ID."
        );
      }

      const feeStructure =
        await prisma.feeStructure.findUnique({
          where: {
            id: parsedFeeStructureId,
          },
        });

      if (!feeStructure) {
        return sendError(
          res,
          404,
          "Fee structure not found."
        );
      }
    }

    const fee =
      await prisma.fee.create({
        data: {
          studentId:
            parsedStudentId,

          feeStructureId:
            parsedFeeStructureId,

          title:
            title ||
            description ||
            "Academic Fee",

          totalAmount:
            parsedAmount,

          paidAmount: 0,

          dueDate:
            parsedDueDate ||
            new Date(),

          status:
            status ||
            "PENDING",
        },
      });

    return res.status(201).json({
      success: true,

      message:
        "Fee created successfully.",

      fee,
    });
  } catch (error) {
    console.error(
      "Create fee error:",
      error
    );

    return sendError(
      res,
      500,
      error.message ||
        "Failed to create fee."
    );
  }
};

// ============================================================
// RECORD PAYMENT - ADMIN / FACULTY
// POST /api/fees/:id/payment
// ============================================================

export const recordPayment = async (
  req,
  res
) => {
  try {
    if (!canManageFees(req)) {
      return sendError(
        res,
        403,
        "Only admin or faculty can record payments."
      );
    }

    const feeId =
      parsePositiveInteger(
        req.params.id
      );

    if (!feeId) {
      return sendError(
        res,
        400,
        "Invalid fee ID."
      );
    }

    const fee =
      await prisma.fee.findUnique({
        where: {
          id: feeId,
        },
      });

    if (!fee) {
      return sendError(
        res,
        404,
        "Fee record not found."
      );
    }

    const paymentAmount =
      req.body.amount !== undefined
        ? Number(req.body.amount)
        : Math.max(
            Number(fee.totalAmount || 0) -
              Number(fee.paidAmount || 0),
            0
          );

    if (
      !Number.isFinite(
        paymentAmount
      ) ||
      paymentAmount <= 0
    ) {
      return sendError(
        res,
        400,
        "Invalid payment amount."
      );
    }

    const totalAmount =
      Number(
        fee.totalAmount || 0
      );

    const currentPaid =
      Number(
        fee.paidAmount || 0
      );

    const pendingAmount =
      Math.max(
        totalAmount -
          currentPaid,
        0
      );

    if (
      paymentAmount >
      pendingAmount
    ) {
      return sendError(
        res,
        400,
        `Payment cannot exceed pending amount of ₹${pendingAmount}.`
      );
    }

    const newPaidAmount =
      currentPaid +
      paymentAmount;

    const newStatus =
      newPaidAmount >=
      totalAmount
        ? "PAID"
        : "PARTIAL";

    const updatedFee =
      await prisma.fee.update({
        where: {
          id: feeId,
        },
        data: {
          paidAmount:
            newPaidAmount,

          status:
            newStatus,
        },
      });

    return res.status(200).json({
      success: true,

      message:
        "Payment recorded successfully.",

      amount:
        paymentAmount,

      fee:
        updatedFee,
    });
  } catch (error) {
    console.error(
      "Record payment error:",
      error
    );

    return sendError(
      res,
      500,
      error.message ||
        "Failed to record payment."
    );
  }
};

// ============================================================
// CREATE RAZORPAY ORDER - STUDENT
// POST /api/fees/:id/create-order
// ============================================================

export const createRazorpayOrder =
  async (req, res) => {
    try {
      // ------------------------------------------------------
      // STUDENT CHECK
      // ------------------------------------------------------

      if (!isStudent(req)) {
        return sendError(
          res,
          403,
          "Only students can create payment orders."
        );
      }

      // ------------------------------------------------------
      // ONLINE PAYMENT SETTING
      // ------------------------------------------------------

      const paymentSetting =
        await prisma.paymentSetting.findUnique({
          where: {
            id: 1,
          },
        });

      /*
       * If no setting exists, online payment
       * remains enabled by default.
       */

      if (
        paymentSetting &&
        paymentSetting.onlinePayment === false
      ) {
        return sendError(
          res,
          403,
          "Online fee payment is currently disabled by the administrator."
        );
      }

      // ------------------------------------------------------
      // RAZORPAY CONFIGURATION
      // ------------------------------------------------------

      if (
        !process.env.RAZORPAY_KEY_ID ||
        !process.env.RAZORPAY_KEY_SECRET
      ) {
        return sendError(
          res,
          500,
          "Razorpay is not configured on the server."
        );
      }

      // ------------------------------------------------------
      // FEE ID
      // ------------------------------------------------------

      const feeId =
        parsePositiveInteger(
          req.params.id
        );

      if (!feeId) {
        return sendError(
          res,
          400,
          "Invalid fee ID."
        );
      }

      // ------------------------------------------------------
      // STUDENT
      // ------------------------------------------------------

      const student =
        await prisma.student.findUnique({
          where: {
            userId:
              req.user.userId,
          },
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

      if (!student) {
        return sendError(
          res,
          404,
          "Student profile not found."
        );
      }

      // ------------------------------------------------------
      // FEE
      // ------------------------------------------------------

      const fee =
        await prisma.fee.findUnique({
          where: {
            id: feeId,
          },
        });

      if (!fee) {
        return sendError(
          res,
          404,
          "Fee record not found."
        );
      }

      // ------------------------------------------------------
      // OWNERSHIP
      // ------------------------------------------------------

      if (
        fee.studentId !==
        student.id
      ) {
        return sendError(
          res,
          403,
          "You cannot pay this fee."
        );
      }

      // ------------------------------------------------------
      // AMOUNT CALCULATION
      // ------------------------------------------------------

      const totalAmount =
        Number(
          fee.totalAmount || 0
        );

      const paidAmount =
        Number(
          fee.paidAmount || 0
        );

      const pendingAmount =
        Math.max(
          totalAmount -
            paidAmount,
          0
        );

      if (
        pendingAmount <= 0 ||
        fee.status === "PAID"
      ) {
        return sendError(
          res,
          400,
          "This fee has already been fully paid."
        );
      }

      /*
       * IMPORTANT:
       *
       * The database uses totalAmount,
       * NOT fee.amount.
       *
       * Razorpay expects paise.
       *
       * ₹100 = 10000 paise
       */

      const amountInPaise =
        Math.round(
          pendingAmount * 100
        );

      if (
        !Number.isFinite(
          amountInPaise
        ) ||
        amountInPaise <= 0
      ) {
        return sendError(
          res,
          400,
          "Invalid fee amount."
        );
      }

      // ------------------------------------------------------
      // CREATE RAZORPAY ORDER
      // ------------------------------------------------------

      const order =
        await razorpay.orders.create({
          amount:
            amountInPaise,

          currency:
            "INR",

          receipt:
            `fee_${fee.id}_${Date.now()}`,

          notes: {
            feeId:
              String(fee.id),

            studentId:
              String(student.id),

            feeTitle:
              fee.title,
          },
        });

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return res.status(201).json({
        success: true,

        message:
          "Razorpay order created successfully.",

        order: {
          id:
            order.id,

          amount:
            order.amount,

          currency:
            order.currency,
        },

        keyId:
          process.env
            .RAZORPAY_KEY_ID,

        fee: {
          id:
            fee.id,

          title:
            fee.title,

          totalAmount,

          paidAmount,

          pendingAmount,
        },

        student: {
          name:
            `${student.user?.firstName || ""} ${
              student.user?.lastName || ""
            }`.trim(),

          email:
            student.user?.email || "",
        },
      });
    } catch (error) {
      console.error(
        "Create Razorpay order error:",
        error
      );

      return sendError(
        res,
        500,
        error.message ||
          "Failed to create Razorpay order."
      );
    }
  };

// ============================================================
// VERIFY RAZORPAY PAYMENT
// POST /api/fees/verify-payment
// ============================================================

export const verifyRazorpayPayment =
  async (req, res) => {
    try {
      // ------------------------------------------------------
      // STUDENT CHECK
      // ------------------------------------------------------

      if (!isStudent(req)) {
        return sendError(
          res,
          403,
          "Only students can verify payments."
        );
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        feeId,
      } = req.body;

      // ------------------------------------------------------
      // VALIDATION
      // ------------------------------------------------------

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !feeId
      ) {
        return sendError(
          res,
          400,
          "Payment verification details are incomplete."
        );
      }

      const parsedFeeId =
        parsePositiveInteger(
          feeId
        );

      if (!parsedFeeId) {
        return sendError(
          res,
          400,
          "Invalid fee ID."
        );
      }

      // ------------------------------------------------------
      // STUDENT
      // ------------------------------------------------------

      const student =
        await prisma.student.findUnique({
          where: {
            userId:
              req.user.userId,
          },
          select: {
            id: true,
          },
        });

      if (!student) {
        return sendError(
          res,
          404,
          "Student profile not found."
        );
      }

      // ------------------------------------------------------
      // FEE
      // ------------------------------------------------------

      const fee =
        await prisma.fee.findUnique({
          where: {
            id: parsedFeeId,
          },
        });

      if (!fee) {
        return sendError(
          res,
          404,
          "Fee record not found."
        );
      }

      if (
        fee.studentId !==
        student.id
      ) {
        return sendError(
          res,
          403,
          "You cannot verify payment for this fee."
        );
      }

      // ------------------------------------------------------
      // SIGNATURE VERIFICATION
      // ------------------------------------------------------

      const generatedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest("hex");

      if (
        generatedSignature !==
        razorpay_signature
      ) {
        return sendError(
          res,
          400,
          "Invalid Razorpay payment signature."
        );
      }

      // ------------------------------------------------------
      // FETCH RAZORPAY ORDER
      // ------------------------------------------------------

      const order =
        await razorpay.orders.fetch(
          razorpay_order_id
        );

      // ------------------------------------------------------
      // VERIFY ORDER AMOUNT
      // ------------------------------------------------------

      const totalAmount =
        Number(
          fee.totalAmount || 0
        );

      const currentPaidAmount =
        Number(
          fee.paidAmount || 0
        );

      const expectedPendingAmount =
        Math.max(
          totalAmount -
            currentPaidAmount,
          0
        );

      if (
        Number(order.amount) !==
        expectedPendingAmount *
          100
      ) {
        return sendError(
          res,
          400,
          "Payment amount does not match the pending fee amount."
        );
      }

      // ------------------------------------------------------
      // FETCH RAZORPAY PAYMENT
      // ------------------------------------------------------

      const payment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );

      // ------------------------------------------------------
      // VERIFY PAYMENT ORDER
      // ------------------------------------------------------

      if (
        payment.order_id !==
        razorpay_order_id
      ) {
        return sendError(
          res,
          400,
          "Payment does not belong to this order."
        );
      }

      // ------------------------------------------------------
      // VERIFY PAYMENT AMOUNT
      // ------------------------------------------------------

      if (
        Number(payment.amount) !==
        Number(order.amount)
      ) {
        return sendError(
          res,
          400,
          "Payment amount verification failed."
        );
      }

      // ------------------------------------------------------
      // VERIFY CAPTURE STATUS
      // ------------------------------------------------------

      if (
        payment.status !==
        "captured"
      ) {
        return sendError(
          res,
          400,
          `Payment is not captured. Current status: ${payment.status}.`
        );
      }

      // ------------------------------------------------------
      // DUPLICATE PAYMENT CHECK
      // ------------------------------------------------------

      const existingPayment =
        await prisma.feePayment.findFirst({
          where: {
            transactionId:
              razorpay_payment_id,
          },
        });

      if (existingPayment) {
        return res.status(200).json({
          success: true,

          message:
            "Payment has already been recorded.",

          payment:
            existingPayment,
        });
      }

      // ------------------------------------------------------
      // PAYMENT AMOUNT
      // ------------------------------------------------------

      const paymentAmount =
        Number(payment.amount) /
        100;

      const newPaidAmount =
        currentPaidAmount +
        paymentAmount;

      if (
        newPaidAmount >
        totalAmount
      ) {
        return sendError(
          res,
          400,
          "Payment would exceed the total fee amount."
        );
      }

      const newStatus =
        newPaidAmount >=
        totalAmount
          ? "PAID"
          : "PARTIAL";

      // ------------------------------------------------------
      // SAVE PAYMENT + UPDATE FEE
      // ------------------------------------------------------

      const result =
        await prisma.$transaction(
          async (tx) => {
            const paymentRecord =
              await tx.feePayment.create({
                data: {
                  feeId:
                    parsedFeeId,

                  amount:
                    paymentAmount,

                  paymentMethod:
                    "ONLINE",

                  transactionId:
                    razorpay_payment_id,
                },
              });

            const updatedFee =
              await tx.fee.update({
                where: {
                  id:
                    parsedFeeId,
                },

                data: {
                  paidAmount:
                    newPaidAmount,

                  status:
                    newStatus,
                },
              });

            return {
              payment:
                paymentRecord,

              fee:
                updatedFee,
            };
          }
        );

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          "Payment verified successfully.",

        paymentId:
          razorpay_payment_id,

        orderId:
          razorpay_order_id,

        payment:
          result.payment,

        fee:
          result.fee,
      });
    } catch (error) {
      console.error(
        "Verify Razorpay payment error:",
        error
      );

      return sendError(
        res,
        500,
        error.message ||
          "Failed to verify payment."
      );
    }
  };