// Error handling middleware - prevents information disclosure
const errorHandler = (err, req, res, next) => {
  // Log full error details server-side only
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // Don't expose internal errors to client
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle known error types
  if (err.status) {
    return res.status(err.status).json({ 
      error: err.message || 'Request failed' 
    });
  }
  
  // Generic error response for production
  res.status(500).json({ 
    error: isDevelopment ? err.message : 'Internal server error' 
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = { errorHandler, asyncHandler };

