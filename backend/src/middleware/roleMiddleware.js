const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = String(
      req.user?.role || ""
    ).toUpperCase();

    const normalizedRoles =
      allowedRoles.map((role) =>
        String(role).toUpperCase()
      );

    if (
      !userRole ||
      !normalizedRoles.includes(userRole)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to access this resource.",
      });
    }

    next();
  };
};

export default roleMiddleware;