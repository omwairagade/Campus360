import prisma from "../lib/prisma.js";

export async function getPaymentSetting(req, res) {
  try {
    let setting = await prisma.paymentSetting.findUnique({
      where: {
        id: 1,
      },
    });

    if (!setting) {
      setting = await prisma.paymentSetting.create({
        data: {
          id: 1,
          onlinePayment: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      onlinePayment: setting.onlinePayment,
      setting,
    });
  } catch (error) {
    console.error(
      "Get payment setting error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to get payment setting.",
    });
  }
}

export async function updatePaymentSetting(req, res) {
  try {
    const { onlinePayment } = req.body;

    if (typeof onlinePayment !== "boolean") {
      return res.status(400).json({
        success: false,
        message:
          "onlinePayment must be a boolean value.",
      });
    }

    const setting = await prisma.paymentSetting.upsert({
      where: {
        id: 1,
      },
      update: {
        onlinePayment,
      },
      create: {
        id: 1,
        onlinePayment,
      },
    });

    return res.status(200).json({
      success: true,
      message: onlinePayment
        ? "Online payments enabled successfully."
        : "Online payments disabled successfully.",
      onlinePayment: setting.onlinePayment,
      setting,
    });
  } catch (error) {
    console.error(
      "Update payment setting error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to update payment setting.",
    });
  }
}