# Security Fixes Implementation Guide

## Quick Reference for Critical Fixes

### 1. Fix Hardcoded Credentials

**File:** `src/context/auth.tsx`

**Current (INSECURE):**
```typescript
const valid = username === "admin" && password === "P@ssw0rd";
```

**Fixed:**
```typescript
import bcrypt from 'bcryptjs';

// Store hashed password (run once to generate)
// const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'P@ssw0rd', 10);

const valid = username === process.env.ADMIN_USERNAME && 
              await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
```

**Environment Variables (.env):**
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$... (bcrypt hash)
```

---

### 2. Add Backend Authentication Middleware

**File:** `server/middleware/auth.js` (NEW FILE)
```javascript
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
```

**Update:** `server/index.js`
```javascript
const { authenticate } = require('./middleware/auth');

// Protect all API routes
app.use('/api', authenticate);

// Exception: Login endpoint (if you add one)
app.post('/api/login', loginHandler); // No auth required
```

---

### 3. Fix XSS Vulnerabilities

**File:** `src/components/AICompanion.tsx`

**Install:** `npm install dompurify @types/dompurify`

**Current (INSECURE):**
```typescript
<div dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
```

**Fixed:**
```typescript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(formatMessageContent(message.content)) 
}} />
```

---

### 4. Fix CORS Configuration

**File:** `server/index.js`

**Current (INSECURE):**
```javascript
app.use(cors());
```

**Fixed:**
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8080'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

---

### 5. Add Input Validation

**File:** `server/middleware/validation.js` (NEW FILE)
```javascript
const validator = require('validator');
const { body, validationResult } = require('express-validator');

const validateUrl = [
  body('url')
    .isURL({ protocols: ['https'], require_protocol: true })
    .withMessage('Must be a valid HTTPS URL')
    .isLength({ min: 1, max: 2048 })
    .withMessage('URL must be between 1 and 2048 characters')
    .custom((value) => {
      // Block SSRF attempts
      const urlObj = new URL(value);
      const hostname = urlObj.hostname;
      
      // Block localhost and private IPs
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.16.')) {
        throw new Error('Invalid URL: Internal addresses not allowed');
      }
      
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateUrl };
```

**Update:** `server/index.js`
```javascript
const { validateUrl } = require('./middleware/validation');

app.post('/api/urls', validateUrl, async (req, res) => {
  // ... existing code
});
```

---

### 6. Add Rate Limiting

**Install:** `npm install express-rate-limit`

**File:** `server/middleware/rateLimit.js` (NEW FILE)
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit login attempts
  skipSuccessfulRequests: true,
});

module.exports = { apiLimiter, authLimiter };
```

**Update:** `server/index.js`
```javascript
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');

app.use('/api', apiLimiter);
app.post('/api/login', authLimiter, loginHandler);
```

---

### 7. Add Security Headers

**Install:** `npm install helmet`

**File:** `server/index.js`
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline if possible
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 8. Fix Error Handling

**File:** `server/index.js`

**Current (INSECURE):**
```javascript
catch (error) {
  res.status(500).json({ error: error.message });
}
```

**Fixed:**
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err); // Log full error server-side
  
  // Don't expose internal errors to client
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({ error: message });
};

app.use(errorHandler);
```

---

### 9. Strengthen Content Security Policy

**File:** `index.html`

**Current (WEAK):**
```html
content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; ..."
```

**Fixed:**
```html
content="default-src 'self'; 
         script-src 'self' 'nonce-{SERVER_GENERATED_NONCE}'; 
         style-src 'self' 'unsafe-inline'; 
         img-src 'self' data: https:; 
         connect-src 'self' https: ws: wss: http://localhost:3001; 
         frame-ancestors 'none'; 
         base-uri 'self'; 
         form-action 'self'"
```

---

### 10. Fix Session Management

**File:** `src/context/auth.tsx`

**Current (INSECURE):**
```typescript
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
```

**Fixed:**
```typescript
// Use crypto API for secure random
const generateSessionId = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
```

---

## Installation Commands

```bash
# Install security dependencies
npm install bcryptjs jsonwebtoken express-validator express-rate-limit helmet dompurify
npm install --save-dev @types/dompurify @types/bcryptjs @types/jsonwebtoken

# Server dependencies
cd server
npm install bcryptjs jsonwebtoken express-validator express-rate-limit helmet
```

---

## Environment Variables Template

Create `.env` file:

```env
# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt_hash>
JWT_SECRET=<random_32_char_string>

# CORS
ALLOWED_ORIGINS=http://localhost:8080,https://yourdomain.com

# Server
NODE_ENV=production
PORT=3001

# Database
DB_PATH=./database.sqlite
```

---

## Testing Checklist

- [ ] Authentication required for all API endpoints
- [ ] XSS attacks prevented (test with `<script>alert('XSS')</script>`)
- [ ] CSRF protection working
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak information
- [ ] HTTPS enforced in production
- [ ] Security headers present
- [ ] Session management secure
- [ ] No hardcoded credentials

---

## Priority Order

1. **Week 1:** Fix authentication, input validation, XSS
2. **Week 2:** Add rate limiting, security headers, error handling
3. **Week 3:** Session management, CORS, CSP improvements

---

**Note:** This is a quick reference. Refer to SECURITY_REVIEW.md for detailed explanations.

