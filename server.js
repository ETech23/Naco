// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 8091;

// Middleware
app.use(cors());
/**app.use(express.json());**/
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/naco', {
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Mongoose Models

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  location: { type: String, required: true },
  role: { type: String, enum: ['client', 'artisan'], default: 'client' },
  artisan_profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ArtisanProfile'
  },
  premium: { type: Boolean, default: false },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  avatar: { type: String, default: null },
  avatarPublicId: { type: String, default: null },
  about: { type: String, default: '' },
  skill: { type: String, default: 'General Services' },
  years_experience: { type: Number, default: 0 },
  completed_jobs: { type: Number, default: 0 },
  last_seen: { type: Date, default: Date.now },
  emailVisibility: { type: Boolean, default: true }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

// Artisan Profile Schema
const artisanProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: String, default: 'General Services' },
  specialties: [{ type: String }],
  description: { type: String, default: '' },
  rate: { type: Number, default: 5000 },
  rating: { type: Number, default: 0 },
  years_experience: { type: Number, default: 1 },
  availability: { type: String, enum: ['Available', 'Busy', 'Unavailable'], default: 'Available' },
  completed_jobs: { type: Number, default: 0 }
}, {
  timestamps: true
});

const ArtisanProfile = mongoose.model('ArtisanProfile', artisanProfileSchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Change these to ObjectId to match your user._id format
  bookerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bookedArtisanId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  service: { type: String, required: true },
  description: { type: String, default: '' },
  service_date: { type: Date, required: true },
  service_time: { type: String, required: true },
  amount: { type: Number, required: true },
  payment_method: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'declined', 'completed', 'cancelled', 'in_progress', 'pending_confirmation'],
    default: 'pending' 
  },
  location: { type: String, default: '' },
  reference: { type: String, unique: true }
}, {
  timestamps: true
});

// Add pre-save hook to prevent self-booking
bookingSchema.pre('save', function(next) {
  if (this.bookerUserId.toString() === this.bookedArtisanId.toString()) {
    next(new Error('Cannot book yourself'));
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, default: '' }
}, {
  timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);

// Notification Schema
/** const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema); **/

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['booking', 'payment', 'message', 'system'], default: 'booking' },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  data: {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actionRequired: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);


// Favorite Schema
const favoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  artisan: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

/** const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'naco_uploads', // will show as a folder in your Cloudinary media library
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) =>
      file.fieldname + '-' + Date.now() + path.extname(file.originalname),
  },
});**/

/** const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'naco_uploads',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => file.fieldname + '-' + Date.now(), // remove extname
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});  **/

    const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'naco_uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 800, crop: 'limit' }, // Limit max size
      { quality: 'auto:good' }, // Auto quality optimization
      { fetch_format: 'auto' } // Auto format selection (WebP when supported)
    ],
    public_id: (req, file) => file.fieldname + '-' + Date.now()
  },
});

// Update upload configuration for better compression:
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 2 * 1024 * 1024 // Reduce to 2MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper Functions
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h'
  });
};

const formatArtisanData = (user, completedJobsCount = null) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    location: user.location,
    premium: user.premium || false,
    photo: user.avatar || null, // Cloudinary URL
    photoOptimized: user.avatar ? 
      user.avatar.replace('/upload/', '/upload/f_auto,q_auto,w_400,c_limit/') : 
      null,
    skill: user.skill || 'General Services',
    specialties: user.artisanProfile?.specialties || [],
    description: user.artisanProfile?.description || '',
    about: user.about || '',
    rate: user.artisanProfile?.rate || 0,
    rating: user.artisanProfile?.rating || 0,
    yearsExperience: user.years_experience || 0,
    availability: user.artisanProfile?.availability || 'Available',
    completed_jobs: completedJobsCount !== null ? completedJobsCount : (user.completed_jobs || 0),
    created: user.createdAt,
    updated: user.updatedAt
  };
};

// createNotification helper function
const createNotification = async (userId, title, message, type = 'booking', data = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      data
    });
    await notification.save();
    console.log('Notification created successfully for user:', userId);
    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
};

// Authentication Routes

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name, location, role, phone, skill, rate, yearsExperience, description } = req.body;

    // Validate required fields
    if (!email || !password || !name || !location) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username: email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      username: email,
      email,
      password: hashedPassword,
      name,
      phone: phone || '',
      location,
      role: role || 'client',
      premium: false,
      theme: 'light',
      skill: skill || 'General Services',
      years_experience: yearsExperience || 0
    });

    await user.save();

    // Create artisan profile if role is artisan
    if (role === 'artisan') {
      const artisanProfile = new ArtisanProfile({
        user: user._id,
        skill: skill || 'General Services',
        rate: rate || 5000,
        availability: 'Available',
        rating: 0,
        completed_jobs: 0,
        years_experience: yearsExperience || 1,
        description: description || ''
      });
      await artisanProfile.save();
    }

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ $or: [{ email }, { username: email }] });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Update last seen
    user.last_seen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Logout
app.post('/auth/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { refreshToken } = req.body;

    // If you're using JWT with blacklist
    if (token) {
      // Add token to blacklist/revoked tokens (implement based on your setup)
      await addToTokenBlacklist(token);
    }

    // If you're using refresh tokens, revoke them
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // If you're using sessions, destroy the session
    if (req.session) {
      req.session.destroy();
    }

    // Clear auth cookies if you're using them
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    // Still return success - client should be logged out even if server cleanup fails
    res.status(200).json({ 
      success: true, 
      message: 'Logged out' 
    });
  }
});

// Get current user
app.get('/auth/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User Profile Routes

// Update user profile
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate that ID is present and a valid ObjectId
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing user ID' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Upload profile image
app.post('/users/:id/avatar', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing user ID' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // debug: uncomment to inspect multer/cloudinary result
    // console.log('req.file:', req.file);

    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // store Cloudinary URL (req.file.path) and optional public id (req.file.filename)
    user.avatar = req.file.path;
    user.avatarPublicId = req.file.filename || user.avatarPublicId || null;

    await user.save();

    res.json(user);
  } catch (error) {
    console.error('Avatar upload failed:', error);
    res.status(500).json({ error: 'Avatar upload failed', details: error.message });
  }
});

// Switch user role
app.put('/users/:id/role', authenticateToken, async (req, res) => {
  try {
    const { newRole } = req.body;
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create artisan profile if switching to artisan
    if (newRole === 'artisan') {
      const existingProfile = await ArtisanProfile.findOne({ user: userId });
      
      if (!existingProfile) {
        const artisanProfile = new ArtisanProfile({
          user: userId,
          skill: 'General Services',
          rate: 5000,
          availability: 'Available',
          rating: 0,
          completed_jobs: 0
        });
        await artisanProfile.save();
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Role switch failed:', error);
    res.status(500).json({ error: 'Role switch failed' });
  }
});

// Artisan Routes

// Get all artisans
app.get('/artisans', async (req, res) => {
  try {
    // Find users with artisan role
    const users = await User.find({ role: 'artisan' })
      .sort({ premium: -1, createdAt: -1 })
      .limit(50);

    console.log(`Found ${users.length} artisan users`); // Debug log

    // Get artisan profiles separately if needed
    const userIds = users.map(user => user._id);
    const profiles = await ArtisanProfile.find({ user: { $in: userIds } });
    
    // Map profiles to users
    const usersWithProfiles = users.map(user => {
      const profile = profiles.find(p => p.user.toString() === user._id.toString());
      return {
        ...user.toObject(),
        artisanProfile: profile
      };
    });

    const artisans = usersWithProfiles.map(user => formatArtisanData(user));
    res.json(artisans);
  } catch (error) {
    console.error('Failed to get artisans:', error);
    res.status(500).json({ error: 'Failed to get artisans' });
  }
});

// Get single artisan
app.get('/artisans/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('artisan_profile');
    if (!user || user.role !== 'artisan') {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    // Count completed jobs from bookings
    const completedJobs = await Booking.countDocuments({
      artisan: req.params.id,
      status: 'completed'
    });

    const formattedArtisan = formatArtisanData(user, completedJobs);
    res.json(formattedArtisan);
  } catch (error) {
    console.error('Failed to get artisan:', error);
    res.status(500).json({ error: 'Failed to get artisan' });
  }
});

// Search artisans
app.get('/artisans/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { city } = req.query;

    let filter = { role: 'artisan' };
    
    if (city) {
      filter.location = city;
    }

    const users = await User.find(filter).populate('artisan_profile');

    let filteredResults = users;

    // Apply fuzzy search if query provided
    if (query && query.length >= 3) {
      const searchTerm = query.toLowerCase();
      
      filteredResults = users.map(user => {
        const skill = (user.skill || '').toLowerCase();
        const about = (user.about || '').toLowerCase();
        const location = (user.location || '').toLowerCase();
        const name = (user.name || '').toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // Exact matches get highest score
        if (skill.includes(searchTerm)) score += 10;
        if (about.includes(searchTerm)) score += 8;
        if (name.includes(searchTerm)) score += 6;
        if (location.includes(searchTerm)) score += 4;
        
        // Partial matches (3+ characters)
        const queryParts = searchTerm.split(' ').filter(part => part.length >= 3);
        queryParts.forEach(part => {
          if (skill.includes(part)) score += 3;
          if (about.includes(part)) score += 2;
          if (name.includes(part)) score += 2;
          if (location.includes(part)) score += 1;
        });
        
        return { ...user.toObject(), relevanceScore: score };
      })
      .filter(user => user.relevanceScore > 0)
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (a.premium !== b.premium) {
          return b.premium - a.premium;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    const artisans = filteredResults.map(user => formatArtisanData(user));
    res.json(artisans);
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});



// Booking Routes
// Create booking with validation
app.post('/bookings', authenticateToken, async (req, res) => {
  try {
    const { bookedArtisanId, service, description, service_date, service_time, amount, payment_method, location } = req.body;
    
    // Validate required fields
    const requiredFields = { 
      bookedArtisanId, 
      service, 
      service_date, 
      service_time, 
      amount, 
      payment_method 
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value && value !== 0)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      console.log('Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}`,
        received: req.body
      });
    }
    
    // Validate data types
    if (isNaN(Number(amount))) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }
    
    // Validate date
    const parsedDate = new Date(service_date);
    if (isNaN(parsedDate.getTime())) {
      console.log('Invalid date:', service_date);
      return res.status(400).json({ error: 'Invalid service date' });
    }
    
    // Prevent self-booking
    console.log('Checking self-booking:', req.user.id, 'vs', bookedArtisanId);
    if (req.user.id === bookedArtisanId || req.user.id.toString() === bookedArtisanId.toString()) {
      console.log('Self-booking prevented');
      return res.status(400).json({ error: 'Cannot book yourself' });
    }
    
    // Check if booked artisan exists
    const bookedArtisan = await User.findById(bookedArtisanId);
    if (!bookedArtisan) {
      console.log('Booked artisan not found:', bookedArtisanId);
      return res.status(400).json({ error: 'Artisan not found' });
    }

    // Get client details
    const client = await User.findById(req.user.id);
    
    // Create booking object
    const bookingData = {
      client: req.user.id,
      artisan: bookedArtisanId,
      bookerUserId: req.user.id,      
      bookedArtisanId: bookedArtisanId, 
      service,
      description: description || '',
      service_date: parsedDate,
      service_time,
      amount: Number(amount),
      payment_method,
      location: location || '',
      reference: 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      status: 'pending'
    };
    
    console.log('Creating booking with data:', bookingData);
    
    const booking = new Booking(bookingData);
    const savedBooking = await booking.save();
    
    console.log('Booking saved successfully:', savedBooking._id);
    
    // CREATE NOTIFICATION FOR THE BOOKED ARTISAN
    try {
      await createNotification(
        bookedArtisanId,
        'New Booking Request',
        `${client.name} has requested your ${service} service for ${parsedDate.toLocaleDateString()} at ${service_time}`,
        'booking',
        {
          bookingId: savedBooking._id,
          userId: req.user.id,
          actionRequired: true
        }
      );
      console.log('Notification sent to artisan');
    } catch (notifError) {
      console.error('Failed to create notification:', notifError);
      // Don't fail the booking if notification fails
    }
    
    // Populate the response with user details
    const populatedBooking = await Booking.findById(savedBooking._id)
      .populate('client', 'name email phone')
      .populate('artisan', 'name email skill phone');
    
    console.log('Populated booking:', populatedBooking);
    
    res.status(201).json(populatedBooking);
    
  } catch (error) {
    console.error('Booking creation error:', error);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.log('Validation errors:', validationErrors);
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors,
        fields: error.errors
      });
    }
    
    if (error.name === 'CastError') {
      console.log('Cast error:', error.message);
      return res.status(400).json({ 
        error: 'Invalid data format',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});


// 

// Get user bookings with proper population
app.get('/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [
        { bookerUserId: req.user.id },
        { bookedArtisanId: req.user.id }
      ]
    })
    .populate('client', 'name email phone')
    .populate('artisan', 'name email skill phone')
    .sort({ createdAt: -1 });
    
    // Normalize the response to match frontend expectations
    const normalizedBookings = bookings.map(booking => ({
      id: booking._id,
      _id: booking._id,
      service: booking.service,
      description: booking.description,
      date: booking.service_date,
      service_date: booking.service_date,
      time: booking.service_time,
      service_time: booking.service_time,
      amount: booking.amount,
      status: booking.status,
      reference: booking.reference,
      location: booking.location,
      payment_method: booking.payment_method,
      paymentMethod: booking.payment_method,
      
      // Client/Booker information
      client: booking.client,
      clientId: booking.client._id,
      clientName: booking.client.name,
      bookerUserId: booking.bookerUserId,
      
      // Artisan information
      artisan: booking.artisan,
      artisanId: booking.artisan._id,
      artisanName: booking.artisan.name,
      bookedArtisanId: booking.bookedArtisanId,
      
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));
    
    res.json(normalizedBookings);
  } catch (error) {
    console.error('Failed to get bookings:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Booking status
app.put('/bookings/:id/start', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.bookedArtisanId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the booked artisan can start this job' });
    }
    
    booking.status = 'in_progress';
    await booking.save();
    
    // Notify client that job has started
    await createNotification(
      booking.bookerUserId,
      'Job Started',
      'Your artisan has started working on your job',
      'booking',
      { bookingId: booking._id }
    );
    
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add the missing reject completion route
app.put('/bookings/:id/reject', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.bookerUserId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the person who placed the booking can reject completion' });
    }
    
    booking.status = 'in_progress'; // Return to in_progress state
    await booking.save();
    
    // Notify artisan that completion was rejected
    await createNotification(
      booking.bookedArtisanId,
      'Job Completion Rejected',
      'The client has requested additional work on this job',
      'booking',
      { bookingId: booking._id }
    );
    
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/bookings/:id/:action', authenticateToken, async (req, res) => {
  try {
    const { id, action } = req.params;
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    let newStatus;
    let allowedUser;
    
    switch (action) {
      case 'accept':
        newStatus = 'confirmed';
        allowedUser = booking.bookedArtisanId;
        break;
      case 'decline':
        newStatus = 'declined';
        allowedUser = booking.bookedArtisanId;
        break;
      case 'complete':
        newStatus = 'pending_confirmation';
        allowedUser = booking.bookedArtisanId;
        break;
      case 'confirm':
        newStatus = 'completed';
        allowedUser = booking.bookerUserId;
        break;
      case 'cancel':
        newStatus = 'cancelled';
        allowedUser = [booking.bookerUserId, booking.bookedArtisanId];
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Check permissions
    const isAllowed = Array.isArray(allowedUser) 
      ? allowedUser.some(id => id.toString() === req.user.id)
      : allowedUser.toString() === req.user.id;
      
    if (!isAllowed) {
      return res.status(403).json({ error: 'Not authorized for this action' });
    }
    
    booking.status = newStatus;
    await booking.save();
    
    // Create appropriate notifications
    let recipientId, title, message;
    
    switch (action) {
      case 'accept':
        recipientId = booking.bookerUserId;
        title = 'Booking Confirmed';
        message = 'Your booking has been accepted';
        break;
      case 'complete':
        recipientId = booking.bookerUserId;
        title = 'Job Completed';
        message = 'Please review and confirm the completed work';
        break;
      case 'confirm':
        recipientId = booking.bookedArtisanId;
        title = 'Job Confirmed';
        message = 'Client has confirmed job completion';
        break;
    }
    
    if (recipientId && recipientId.toString() !== req.user.id) {
      await createNotification(recipientId, title, message, 'booking', { bookingId: id });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Booking action failed:', error);
    res.status(500).json({ error: 'Action failed' });
  }
});

// Review Routes

// Get reviews for artisan
app.get('/reviews/artisan/:id', async (req, res) => {
  try {
    const reviews = await Review.find({ artisan: req.params.id })
      .populate({
        path: 'reviewer',
        select: 'name premium avatar email' // Include email for debugging
      })
      .populate('booking', 'service service_date')
      .sort({ createdAt: -1 })
      .limit(50);

    // Debug log to see what we're getting
    console.log('Reviews found:', reviews.length);
    if (reviews.length > 0) {
      console.log('Sample review data:', {
        reviewer: reviews[0].reviewer,
        hasAvatar: !!reviews[0].reviewer?.avatar
      });
    }

    const formattedReviews = reviews.map(review => {
      // Get avatar URL - handle both Cloudinary and local uploads
      let avatarUrl = null;
      if (review.reviewer?.avatar) {
        // If it's already a full URL (Cloudinary)
        if (review.reviewer.avatar.startsWith('http')) {
          avatarUrl = review.reviewer.avatar;
        } 
        // If it's a relative path or filename
        else {
          avatarUrl = review.reviewer.avatar;
        }
      }

      return {
        id: review._id,
        rating: review.rating,
        text: review.text || review.comment || '',
        reviewerName: review.reviewer?.name || 'Anonymous',
        reviewerPremium: review.reviewer?.premium || false,
        reviewerAvatar: avatarUrl,
        reviewerEmail: review.reviewer?.email || null, // For debugging
        date: review.createdAt,
        service: review.booking?.service || '',
        serviceDate: review.booking?.service_date || null
      };
    });

    console.log('Formatted reviews sample:', formattedReviews[0]); // Debug log

    res.json(formattedReviews);
  } catch (error) {
    console.error('Failed to get reviews:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

app.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { bookingId, artisanId, rating, text } = req.body;

    // Validate inputs
    if (!bookingId || !artisanId || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ error: 'Review already exists for this booking' });
    }

    // Verify the booking exists and belongs to the user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.bookerUserId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'You can only review your own bookings' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }

    const review = new Review({
      booking: bookingId,
      reviewer: req.user.id,
      artisan: artisanId,
      rating: Number(rating),
      text: text || ''
    });

    await review.save();

    // Update artisan's average rating
    const reviews = await Review.find({ artisan: artisanId });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;
    
    // Update artisan profile with new average
    await ArtisanProfile.findOneAndUpdate(
      { user: artisanId },
      { rating: Math.round(avgRating * 10) / 10 }
    );

    // Populate the review before returning
    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name premium avatar');

    res.status(201).json({
      id: populatedReview._id,
      rating: populatedReview.rating,
      text: populatedReview.text,
      reviewerName: populatedReview.reviewer?.name || 'Anonymous',
      reviewerPremium: populatedReview.reviewer?.premium || false,
      reviewerAvatar: populatedReview.reviewer?.avatar || null,
      date: populatedReview.createdAt
    });
  } catch (error) {
    console.error('Review creation failed:', error);
    res.status(500).json({ error: 'Review creation failed' });
  }
});
// Create review
app.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { bookingId, artisanId, rating, text } = req.body;

    const review = new Review({
      booking: bookingId,
      reviewer: req.user.id,
      artisan: artisanId,
      rating,
      text
    });

    await review.save();

    // Update artisan's average rating
    const reviews = await Review.find({ artisan: artisanId });
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;
    
    // Update artisan profile with new average
    const profile = await ArtisanProfile.findOneAndUpdate(
      { user: artisanId },
      { rating: Math.round(avgRating * 10) / 10 }
    );

    res.status(201).json(review);
  } catch (error) {
    console.error('Review creation failed:', error);
    res.status(500).json({ error: 'Review creation failed' });
  }
});

// Notification Routes
app.post('/notifications', authenticateToken, async (req, res) => {
  try {
    const { user, title, message, type, data } = req.body;
    
    const notification = new Notification({
      user,
      title,
      message,
      type: type || 'booking',
      data: data || {}
    });
    
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Notification creation failed:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});



// Get notifications
app.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('data.bookingId')
      .populate('data.userId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Normalize notification data
    const normalizedNotifications = notifications.map(notification => ({
      id: notification._id,
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      readAt: notification.readAt,
      created: notification.createdAt,  // Add this field
      createdAt: notification.createdAt,
      data: {
        bookingId: notification.data.bookingId?._id || notification.data.bookingId,
        userId: notification.data.userId?._id || notification.data.userId,
        actionRequired: notification.data.actionRequired || false
      }
    }));
    
    res.json(normalizedNotifications);
  } catch (error) {
    console.error('Failed to get notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark single notification as read
app.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
app.put('/notifications/read', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Favorites Routes

// Toggle favorite
app.post('/favorites/toggle/:artisanId', authenticateToken, async (req, res) => {
  try {
    const artisanId = req.params.artisanId;
    const userId = req.user.id;

    const existing = await Favorite.findOne({ user: userId, artisan: artisanId });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      res.json({ isFavorite: false });
    } else {
      await Favorite.create({ user: userId, artisan: artisanId });
      res.json({ isFavorite: true });
    }
  } catch (error) {
    console.error('Toggle favorite failed:', error);
    res.status(500).json({ error: 'Toggle favorite failed' });
  }
});

// Get user favorites
app.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate({
        path: 'artisan',
        populate: { path: 'artisan_profile' }
      })
      .limit(50);

    const formattedFavorites = favorites.map(fav => formatArtisanData(fav.artisan));
    res.json(formattedFavorites);
  } catch (error) {
    console.error('Failed to get favorites:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Theme Routes
app.put('/users/:id/theme', authenticateToken, async (req, res) => {
  try {
    const { theme } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error('Theme update failed:', error);
    res.status(500).json({ error: 'Theme update failed' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
