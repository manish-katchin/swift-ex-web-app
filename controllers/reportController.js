const Report = require('../models/Report');
const { sendContactNotification, sendBugReportNotification } = require('../services/emailService');

const createReport = async (req, res) => {
    try {
        const { type } = req.body;
        let reportData;

        if (type === 'contact') {
            const { email, phone, message } = req.body;
            reportData = { type, email, phone, message };
            await sendContactNotification({ email, phone, message });
        } else if (type === 'bug') {
            const { bugName, bugDescription, deviceType } = req.body;
            reportData = { type, bugName, bugDescription, deviceType };
            await sendBugReportNotification({ bugName, bugDescription, deviceType });
        } else {
            return res.status(400).json({ success: false, error: 'Invalid report type' });
        }

        const report = new Report(reportData);
        await report.save();

        res.status(201).json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const getReports = async (req, res) => {
    try {
        const { type } = req.query;
        const filter = type ? { type } : {};
        const reports = await Report.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, data: reports, count: reports.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

const getReportById = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ success: false, error: 'Report not found' });
        }
        res.json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { createReport, getReports, getReportById };
