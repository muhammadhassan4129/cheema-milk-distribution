const LabReport = require('../models/LabReport');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/lab-reports
 * @access  Admin, Accountant, Lab Technician
 */
const getLabReports = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.date) filter.date = req.query.date;
  if (req.query.result) filter.result = req.query.result;
  if (req.query.supplierName) filter.supplierName = new RegExp(req.query.supplierName, 'i');

  const reports = await LabReport.find(filter).sort({ date: -1, createdAt: -1 });
  return ApiResponse.ok(reports).send(res);
});

/**
 * @route   POST /api/lab-reports
 * @access  Admin, Lab Technician, Accountant
 */
const createLabReport = asyncHandler(async (req, res) => {
  const now = new Date();
  const report = await LabReport.create({
    ...req.body,
    date: req.body.date || now.toISOString().split('T')[0],
    time: req.body.time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    createdBy: req.user._id,
  });

  return ApiResponse.created(report, 'Lab report added').send(res);
});

/**
 * @route   DELETE /api/lab-reports/:id
 * @access  Admin
 */
const deleteLabReport = asyncHandler(async (req, res) => {
  const report = await LabReport.findByIdAndDelete(req.params.id);
  if (!report) throw ApiError.notFound('Lab report not found');
  return ApiResponse.ok({ id: req.params.id }, 'Lab report deleted').send(res);
});

module.exports = { getLabReports, createLabReport, deleteLabReport };
