const Inquiry = require('../models/Inquiry');

// @desc    Create a new inquiry
// @route   POST /api/inquiries
// @access  Public
exports.createInquiry = async (req, res) => {
  try {
    const { name, email, serviceInterest, message } = req.body;

    const inquiry = await Inquiry.create({
      name,
      email,
      serviceInterest,
      message
    });

    res.status(201).json({
      success: true,
      data: inquiry,
      message: 'Your inquiry has been submitted successfully. We will get back to you soon.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit inquiry'
    });
  }
};

// @desc    Get all inquiries
// @route   GET /api/inquiries
// @access  Private/Admin
exports.getInquiries = async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort('-createdAt');

    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Failed to fetch inquiries'
    });
  }
};

// @desc    Update inquiry status
// @route   PATCH /api/inquiries/:id/status
// @access  Private/Admin
exports.updateInquiryStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    inquiry.status = status;
    if (notes !== undefined) {
      inquiry.notes = notes;
    }

    await inquiry.save();

    res.status(200).json({
      success: true,
      data: inquiry,
      message: 'Inquiry status updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Failed to update inquiry'
    });
  }
};
