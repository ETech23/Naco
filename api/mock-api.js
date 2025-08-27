// PocketBase API Integration for Naco
// Replace your api/mock-api.js with this file

// Initialize PocketBase instance
const pb = new PocketBase('http://localhost:8091');

// Helper function to format artisan data
/**function formatArtisanData(user, completedJobsCount = null) {
  const profile = user.expand?.artisan_profiles_via_user?.[0];
  
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    location: user.location,
    premium: user.premium || false,
    photo: user.avatar ? pb.files.getUrl(user, user.avatar, { thumb: '300x300' }) : null,
    skill: user.skill || 'General Services',
    specialties: profile?.specialties || [],
    description: profile?.description || '',
    rate: profile?.rate || 0,
    rating: profile?.rating || 0,
    yearsExperience: profile?.years_experience || 0,
    availability: profile?.availability || 'Available',
    completed_jobs: completedJobsCount !== null ? completedJobsCount : (profile?.completed_jobs || 0), // Use passed count or fallback to profile
    expand: user.expand, // Keep expand data
    created: user.created,
    updated: user.updated
  };
}**/
function formatArtisanData(user, completedJobsCount = null) {
  const profile = user.expand?.artisan_profiles_via_user?.[0];
  
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    location: user.location,
    premium: user.premium || false,
    photo: user.avatar ? pb.files.getUrl(user, user.avatar, { thumb: '300x300' }) : null,
    skill: user.skill || 'General Services',
    specialties: profile?.specialties || [],
    description: profile?.description || '',
    about: user.about || '',
    rate: profile?.rate || 0,
    rating: profile?.rating || 0,
    yearsExperience: user.years_experience || 0,
    availability: profile?.availability || 'Available',
    /**completedJobs: profile?.completed_jobs || 0,**/
    completed_jobs: completedJobsCount !== null ? completedJobsCount : (profile?.completed_jobs || 0),
    expand: user.expand, // Keep expand data
    created: user.created,
    updated: user.updated
  };
}

// Authentication Functions
export async function registerUser(userData) {
  try {
    // Validate required fields
    if (!userData.email || !userData.password || !userData.name || !userData.location) {
      throw new Error('Please fill in all required fields');
    }

    // Create user account
    const user = await pb.collection('users').create({
      username: userData.email,
      email: userData.email,
      emailVisibility: true,
      password: userData.password,
      passwordConfirm: userData.password,
      name: userData.name,
      phone: userData.phone || '',
      location: userData.location,
      role: userData.role || 'client',
      premium: false,
      theme: 'light'
    });

    // Auto login after registration
    const authData = await pb.collection('users').authWithPassword(
      userData.email, 
      userData.password
    );

    // Create artisan profile if role is artisan
    if (userData.role === 'artisan') {
      await pb.collection('artisan_profiles').create({
        user: user.id,
        skill: userData.skill || 'General Services',
        rate: userData.rate || 5000,
        availability: 'Available',
        rating: 0,
        completed_jobs: 0,
        years_experience: userData.yearsExperience || 1,
        description: userData.description || ''
      });
    }

    return authData.record;
  } catch (error) {
    console.error('Registration failed:', error);
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
}

export async function loginUser(email, password) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    
    // Update last seen
    await pb.collection('users').update(authData.record.id, {
      last_seen: new Date().toISOString()
    });

    return authData.record;
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error('Invalid email or password');
  }
}

export function logout() {
  pb.authStore.clear();
  return Promise.resolve(true);
}

export function getCurrentUser() {
  return pb.authStore.model;
}

export function isAuthenticated() {
  return pb.authStore.isValid;
}

// User Profile Functions
export async function updateUserProfile(userId, updates) {
  try {
    const user = await pb.collection('users').update(userId, updates);
    return user;
  } catch (error) {
    console.error('Profile update failed:', error);
    throw error;
  }
}

export async function switchUserRole(userId, newRole) {
  try {
    const updates = { role: newRole };
    
    // Create artisan profile if switching to artisan
    if (newRole === 'artisan') {
      const existingProfile = await pb.collection('artisan_profiles')
        .getFirstListItem(`user.id = "${userId}"`)
        .catch(() => null);
        
      if (!existingProfile) {
        await pb.collection('artisan_profiles').create({
          user: userId,
          skill: 'General Services',
          rate: 5000,
          availability: 'Available',
          rating: 0,
          completed_jobs: 0
        });
      }
    }

    const user = await pb.collection('users').update(userId, updates);
    return user;
  } catch (error) {
    console.error('Role switch failed:', error);
    throw error;
  }
}

// Artisan Functions

export async function getArtisans() {
  try {
    const result = await pb.collection('users').getList(1, 50, {
      filter: 'role = "artisan"',
      expand: 'artisan_profiles_via_user',
      sort: '-premium,-created'
    });

    return result.items.map(user => formatArtisanData(user)); // No completed jobs count passed
  } catch (error) {
    console.error('Failed to get artisans:', error);
    return [];
  }
}
/**export async function getArtisans() {
  try {
    const result = await pb.collection('users').getList(1, 50, {
      filter: 'role = "artisan"',
      expand: 'artisan_profiles_via_user',
      sort: '-premium,-created'
    });
    return result.items.map(user => formatArtisanData(user));
  } catch (error) {
    console.error('Failed to get artisans:', error);
    return [];
  }
}**/

export async function getFullArtisanData(artisanId) {
  try {
    // Get base user
    const artisan = await pb.collection('users').getOne(artisanId, {
      expand: 'artisan_profiles_via_user'
    });

    // Get artisan profile directly (by user id)
    let profile = null;
    try {
      profile = await pb.collection('artisan_profiles').getFirstListItem(
        `user="${artisanId}"`
      );
    } catch (err) {
      console.warn('No artisan profile found for user:', artisanId);
    }

    // Count completed jobs exactly like in user stats
    let completedJobs = 0;
    try {
      const bookings = await pb.collection('bookings').getFullList({
        filter: `artisan.id = "${artisanId}"`
      });
      completedJobs = bookings.filter(b => b.status === 'completed').length;
    } catch (error) {
      console.error('Failed to load completed jobs:', error);
    }

    // Format the data and add completed jobs count
    const formattedArtisan = formatArtisanData(artisan);
    
    return {
      ...formattedArtisan,
      completed_jobs: completedJobs, // Override with actual count from bookings
      expand: artisan.expand
    };
  } catch (error) {
    console.error('Failed to get full artisan data:', error);
    throw error;
  }
}

/** export async function getFullArtisanData(artisanId) {
  try {
    // Get base user with expanded profiles
    const user = await pb.collection('users').getOne(artisanId, {
      expand: 'artisan_profiles_via_user'
    });

    // Count completed jobs from bookings collection
    const completedBookings = await pb.collection('bookings').getList(1, 1, {
      filter: `artisan.id = "${artisanId}" && status = "completed"`
    });

    // Format the artisan data with completed jobs count
    return formatArtisanData(user, completedBookings.totalItems);

  } catch (error) {
    console.error('Failed to get full artisan data:', error);
    throw error;
  }
}**/

/**export async function getFullArtisanData(artisanId) {
  try {
    // Get base user
    const artisan = await pb.collection('users').getOne(artisanId);

    // Get artisan profile directly (by user id)
    let profile = null;
    try {
      profile = await pb.collection('artisan_profiles').getFirstListItem(
        `user="${artisanId}"`
      );
    } catch (err) {
      console.warn('No artisan profile found for user:', artisanId);
    }

    return formatArtisanData(artisan)
    /**{
      id: user.id,
      name: user.name,
      email: user.email,
      photo: user.avatar,
      premium: user.premium,
      location: user.location,
      // from artisan_profile
      completedJobs: profile?.completed_jobs || 0,
      rating: profile?.rating || 0,
      yearsExperience: profile?.years_experience || 0,
      description: profile?.description || '',
      skill: profile?.skill || '',
      rate: profile?.rate || 0,
      specialties: profile?.specialties || [],
    }**
    ;
  } catch (error) {
    console.error('Failed to get full artisan data:', error);
    throw error;
  }
}**/
/**
export async function searchArtisans(query = '', city = '') {
  try {
    let filter = 'role = "artisan"';
    
    if (city) {
      filter += ` && location = "${city}"`;
    }

    // Get all artisans first
    const result = await pb.collection('users').getFullList({
      filter,
      expand: 'artisan_profiles_via_user'
    });

    let filteredResults = result;

    // Apply fuzzy search if query provided
    if (query && query.length >= 3) {
      const searchTerm = query.toLowerCase();
      
      filteredResults = result.map(user => {
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
        
        return { ...user, relevanceScore: score };
      })
      .filter(user => user.relevanceScore > 0) // Only return matches
      .sort((a, b) => {
        // Sort by relevance, then by premium, then by creation date
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (a.premium !== b.premium) {
          return b.premium - a.premium;
        }
        return new Date(b.created) - new Date(a.created);
      });
    }

    return filteredResults.map(user => formatArtisanData(user));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}**/

export async function searchArtisans(query = '', city = '') {
  try {
    let filter = 'role = "artisan"';
    
    if (query) {
      filter += ` && (name ~ "${query}" || artisan_profiles_via_user.skill ~ "${query}")`;
    }
    
    if (city) {
      filter += ` && location = "${city}"`;
    }

    const result = await pb.collection('users').getList(1, 50, {
      filter,
      expand: 'artisan_profiles_via_user',
      sort: '-premium,-created'
    });

    return result.items.map(user => formatArtisanData(user));
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

        export async function createNotification(userId, notificationData) {
  try {
    const notification = await pb.collection('notifications').create({
      user: userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      read: false,
      data: notificationData.data || {}
    });
    return notification;
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
}

// Booking Functions
export async function createBooking(bookingData) {
  try {
    if (!pb.authStore.isValid) {
      throw new Error('Authentication required');
    }

    const reference = 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    const booking = await pb.collection('bookings').create({
      client: pb.authStore.model.id,
      artisan: bookingData.artisanId,
      service: bookingData.service,
      description: bookingData.notes || bookingData.description || '',
      service_date: bookingData.date,
      service_time: bookingData.time,
      amount: bookingData.amount,
      payment_method: bookingData.payment,
      status: 'pending',
      location: bookingData.location || '',
      reference
    });

    // Create notification for artisan
    await createNotification(bookingData.artisanId, {
      type: 'booking',
      title: 'New Booking Request',
      message: `You have a new booking request for ${bookingData.service}`,
      data: { bookingId: booking.id }
    });

    return { ...booking, reference };
  } catch (error) {
    console.error('Booking creation failed:', error);
    throw error;
  }
}


export async function getUserBookings(userId = null) {
  try {
    if (!pb.authStore.isValid) {
      return [];
    }

    const currentUserId = userId || pb.authStore.model.id;
    
    const result = await pb.collection('bookings').getList(1, 50, {
      filter: `client.id = "${currentUserId}" || artisan.id = "${currentUserId}"`,
      expand: 'client,artisan',
      sort: '-created'
    });

    return result.items.map(booking => ({
      id: booking.id,
      service: booking.service,
      description: booking.description,
      date: booking.service_date,
      time: booking.service_time,
      amount: booking.amount,
      status: booking.status,
      reference: booking.reference,
      location: booking.location,
      paymentMethod: booking.payment_method,
      clientId: booking.client,
      artisanId: booking.artisan,
      clientName: booking.expand?.client?.name,
      artisanName: booking.expand?.artisan?.name,
      artisanCompletedJobs: booking.expand?.artisan?.completed_jobs || 0, // This should work now
      expand: booking.expand, // IMPORTANT: Keep the expand data
      created: booking.created
    }));
  } catch (error) {
    console.error('Failed to get bookings:', error);
    return [];
  }
}

export async function updateBookingStatus(bookingId, status) {
  try {
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'declined', 'completed', 'cancelled', 'in_progress'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const booking = await pb.collection('bookings').update(bookingId, { 
      status: status 
    });
    
    // If status is completed, increment artisan's completed jobs in users collection
    if (status === 'completed') {
      const bookingDetails = await pb.collection('bookings').getOne(bookingId, {
        expand: 'artisan'
      });
      
      const artisan = bookingDetails.expand?.artisan;
      if (artisan) {
        const currentJobs = artisan.completed_jobs || 0;
        await pb.collection('users').update(artisan.id, {
          completed_jobs: currentJobs + 1
        });
      }
    }
    
    // Get booking details for notification
    const bookingDetails = await pb.collection('bookings').getOne(bookingId, {
      expand: 'client,artisan'
    });

    // Create notifications based on status change
    let recipientId, message;
    
    if (status === 'confirmed') {
      recipientId = bookingDetails.client;
      message = 'Your booking has been confirmed by the artisan';
    } else if (status === 'completed') {
      recipientId = bookingDetails.client;  
      message = 'Your booking has been completed. Please leave a review!';
    } else if (status === 'declined') {
      recipientId = bookingDetails.client;
      message = 'Your booking has been declined by the artisan';
    }

    if (recipientId && recipientId !== pb.authStore.model?.id) {
      await createNotification(recipientId, {
        type: 'booking',
        title: 'Booking Update',
        message: message,
        data: { bookingId: bookingId }
      });
    }
    
    return booking;
  } catch (error) {
    console.error('Booking status update failed:', error);
    throw error;
  }
}

// Review Functions
export async function getReviewsForArtisan(artisanId) {
  try {
    const result = await pb.collection('reviews').getList(1, 10, {
      filter: `artisan.id = "${artisanId}"`,
      expand: 'reviewer',
      sort: '-created'
    });

    return result.items.map(review => ({
      id: review.id,
      rating: review.rating,
      text: review.text,
      reviewerName: review.expand?.reviewer?.name || 'Anonymous',
      reviewerPremium: review.expand?.reviewer?.premium || false,
      date: review.created
    }));
  } catch (error) {
    console.error('Failed to get reviews:', error);
    return [];
  }
}

export async function getAllReviewsForRating(artisanId) {
  try {
    const result = await pb.collection('reviews').getFullList({
      filter: `artisan.id = "${artisanId}"`
    });

    // Only return what we need for rating calculation
    return result.map(review => ({
      rating: review.rating
    }));
  } catch (error) {
    console.error('Failed to get reviews for rating:', error);
    return [];
  }
}

export async function createReview(reviewData) {
  try {
    if (!pb.authStore.isValid) {
      throw new Error('Authentication required');
    }

    const review = await pb.collection('reviews').create({
      booking: reviewData.bookingId,
      reviewer: pb.authStore.model.id,
      artisan: reviewData.artisanId,
      rating: reviewData.rating,
      text: reviewData.text
    });

    // Update artisan's average rating
    await updateArtisanRating(reviewData.artisanId);

    return review;
  } catch (error) {
    console.error('Review creation failed:', error);
    throw error;
  }
}

export async function updateArtisanRating(artisanId) {
  try {
    // Get all reviews for this artisan
    const reviews = await pb.collection('reviews').getFullList({
      filter: `artisan.id = "${artisanId}"`
    });

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = totalRating / reviews.length;
      
      // Update artisan profile with new average
      const profile = await pb.collection('artisan_profiles')
        .getFirstListItem(`user.id = "${artisanId}"`);
        
      await pb.collection('artisan_profiles').update(profile.id, {
        rating: Math.round(avgRating * 10) / 10 // Round to 1 decimal
      });
      
      return avgRating;
    }
  } catch (error) {
    console.error('Failed to update artisan rating:', error);
  }
}

// Notification Functions
export async function getNotifications(userId = null) {
  try {
    if (!pb.authStore.isValid) {
      return [];
    }

    const currentUserId = userId || pb.authStore.model.id;
    
    const result = await pb.collection('notifications').getList(1, 20, {
      filter: `user.id = "${currentUserId}"`,
      sort: '-created'
    });

    return result.items;
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return [];
  }
}

export async function markNotificationsRead(userId = null) {
  try {
    if (!pb.authStore.isValid) {
      return;
    }

    const currentUserId = userId || pb.authStore.model.id;
    
    // Get all unread notifications
    const notifications = await pb.collection('notifications').getFullList({
      filter: `user.id = "${currentUserId}" && read = false`
    });

    // Mark them as read
    for (const notification of notifications) {
      await pb.collection('notifications').update(notification.id, { 
        read: true 
      });
    }
  } catch (error) {
    console.error('Failed to mark notifications as read:', error);
    throw error;
  }
}



// Favorites Functions
export async function toggleFavorite(artisanId) {
  try {
    if (!pb.authStore.isValid) {
      throw new Error('Authentication required');
    }

    const userId = pb.authStore.model.id;
    
    // Check if favorite exists
    const existing = await pb.collection('favorites')
      .getFirstListItem(`user.id = "${userId}" && artisan.id = "${artisanId}"`)
      .catch(() => null);

    if (existing) {
      // Remove favorite
      await pb.collection('favorites').delete(existing.id);
      return false;
    } else {
      // Add favorite
      await pb.collection('favorites').create({
        user: userId,
        artisan: artisanId
      });
      return true;
    }
  } catch (error) {
    console.error('Toggle favorite failed:', error);
    throw error;
  }
}

export async function getUserFavorites(userId = null) {
  try {
    if (!pb.authStore.isValid) {
      return [];
    }

    const currentUserId = userId || pb.authStore.model.id;
    
    const result = await pb.collection('favorites').getList(1, 50, {
      filter: `user.id = "${currentUserId}"`,
      expand: 'artisan,artisan.artisan_profiles_via_user'
    });

    return result.items.map(fav => formatArtisanData(fav.expand.artisan));
  } catch (error) {
    console.error('Failed to get favorites:', error);
    return [];
  }
}

// File Upload Functions
export async function uploadAvatar(userId, file) {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const user = await pb.collection('users').update(userId, formData);
    return user;
  } catch (error) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
}

export function getAvatarUrl(user, size = '100x100') {
  if (!user?.avatar) return null;
  return pb.files.getUrl(user, user.avatar, { thumb: size });
}



// Theme Functions
export async function toggleTheme(userId, theme) {
  try {
    const user = await pb.collection('users').update(userId, { theme });
    return user;
  } catch (error) {
    console.error('Theme update failed:', error);
    throw error;
  }
}

// Utility Functions
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
}

// Real-time subscriptions (optional)
export function subscribeToBookings(userId, callback) {
  if (!pb.authStore.isValid) return null;
  
  return pb.collection('bookings').subscribe(
    `client.id = "${userId}" || artisan.id = "${userId}"`, 
    callback
  );
}

export function subscribeToNotifications(userId, callback) {
  if (!pb.authStore.isValid) return null;
  
  return pb.collection('notifications').subscribe(
    `user.id = "${userId}"`, 
    callback
  );
}

export function unsubscribe(subscription) {
  if (subscription) {
    pb.collection.unsubscribe(subscription);
  }
}

// Export pb instance for advanced usage
export { pb };