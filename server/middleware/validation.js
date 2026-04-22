const { body, validationResult } = require('express-validator');

// URL validation middleware
const validateUrl = [
  body('url')
    .trim()
    .notEmpty()
    .withMessage('URL is required')
    .isURL({ 
      protocols: ['https'], 
      require_protocol: true,
      require_valid_protocol: true
    })
    .withMessage('Must be a valid HTTPS URL')
    .isLength({ min: 1, max: 2048 })
    .withMessage('URL must be between 1 and 2048 characters')
    .custom((value) => {
      try {
        const urlObj = new URL(value);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Block SSRF attempts - internal IPs and localhost
        const blockedHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1',
          '[::1]'
        ];
        
        if (blockedHosts.includes(hostname)) {
          throw new Error('Invalid URL: Localhost addresses not allowed');
        }
        
        // Block private IP ranges
        if (hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.16.') ||
            hostname.startsWith('172.17.') ||
            hostname.startsWith('172.18.') ||
            hostname.startsWith('172.19.') ||
            hostname.startsWith('172.20.') ||
            hostname.startsWith('172.21.') ||
            hostname.startsWith('172.22.') ||
            hostname.startsWith('172.23.') ||
            hostname.startsWith('172.24.') ||
            hostname.startsWith('172.25.') ||
            hostname.startsWith('172.26.') ||
            hostname.startsWith('172.27.') ||
            hostname.startsWith('172.28.') ||
            hostname.startsWith('172.29.') ||
            hostname.startsWith('172.30.') ||
            hostname.startsWith('172.31.')) {
          throw new Error('Invalid URL: Private IP addresses not allowed');
        }
        
        return true;
      } catch (err) {
        if (err.message.includes('Invalid URL')) {
          throw err;
        }
        throw new Error('Invalid URL format');
      }
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(e => e.msg)
      });
    }
    next();
  }
];

// Bulk URL validation
const validateBulkUrls = [
  body('urls')
    .isArray({ min: 1, max: 100 })
    .withMessage('URLs must be an array with 1-100 items')
    .custom((urls) => {
      if (!urls.every(url => typeof url === 'string' && url.trim().length > 0)) {
        throw new Error('All URLs must be non-empty strings');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(e => e.msg)
      });
    }
    next();
  }
];

// Incident validation middleware
const validateIncident = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  body('severity')
    .trim()
    .notEmpty()
    .withMessage('Severity is required')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be one of: low, medium, high, critical'),
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Type must be between 1 and 200 characters'),
  body('sourceIP')
    .trim()
    .notEmpty()
    .withMessage('Source IP is required')
    .isLength({ min: 1, max: 45 })
    .withMessage('Source IP must be a valid length'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be under 100 characters'),
  body('responder')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Responder must be under 200 characters'),
  body('destinationIPs')
    .optional()
    .isArray()
    .withMessage('Destination IPs must be an array'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => e.msg)
      });
    }
    next();
  }
];

// Incident update validator (PUT). All fields optional; server-managed fields rejected.
const FORBIDDEN_UPDATE_FIELDS = ['id', 'createdAt', 'updatedAt', 'deletedAt', 'sheetRowHash'];
// Note: `version` is handled separately in the PUT handler for OCC; we strip it before Sequelize sees it as a writable field.

const validateIncidentUpdate = [
  // Reject server-managed fields outright so a malicious/buggy client can't rewrite id/createdAt/etc.
  (req, res, next) => {
    const offending = FORBIDDEN_UPDATE_FIELDS.filter(k => Object.prototype.hasOwnProperty.call(req.body || {}, k));
    if (offending.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [`Field(s) not allowed in update: ${offending.join(', ')}`]
      });
    }
    next();
  },
  body('title').optional().trim().isLength({ min: 1, max: 500 })
    .withMessage('Title must be between 1 and 500 characters'),
  body('description').optional().trim().isLength({ max: 5000 })
    .withMessage('Description must be under 5000 characters'),
  body('severity').optional().trim().isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be one of: low, medium, high, critical'),
  body('status').optional().trim().isIn(['open', 'investigating', 'resolved', 'closed'])
    .withMessage('Status must be one of: open, investigating, resolved, closed'),
  body('responseStatus').optional().trim().isIn(['responded', 'pending'])
    .withMessage('responseStatus must be either "responded" or "pending"'),
  body('type').optional().trim().isLength({ min: 1, max: 200 })
    .withMessage('Type must be between 1 and 200 characters'),
  body('sourceIP').optional().trim().isLength({ min: 1, max: 45 })
    .withMessage('Source IP must be a valid length'),
  body('country').optional().trim().isLength({ max: 100 })
    .withMessage('Country must be under 100 characters'),
  body('responder').optional().trim().isLength({ max: 200 })
    .withMessage('Responder must be under 200 characters'),
  body('responseTime').optional({ nullable: true }).isString()
    .withMessage('responseTime must be a string'),
  body('notes').optional().isString().isLength({ max: 10000 })
    .withMessage('Notes must be under 10000 characters'),
  body('destinationIPs').optional().isArray()
    .withMessage('Destination IPs must be an array'),
  body('timelineEvents').optional().isArray()
    .withMessage('timelineEvents must be an array'),
  // Presence of `version` is enforced by the PUT handler (428), not here — so absence falls through.
  body('version').optional().isInt({ min: 0 })
    .withMessage('version must be a non-negative integer'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map(e => e.msg)
      });
    }
    next();
  }
];

module.exports = { validateUrl, validateBulkUrls, validateIncident, validateIncidentUpdate };

