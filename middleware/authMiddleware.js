const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

        if (decoded.role !== "admin") {
            return res.status(403).json({ success: false, error: "Forbidden" });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: "Invalid token" });
    }
};
