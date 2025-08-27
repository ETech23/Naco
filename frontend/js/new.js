class NacoPocketBaseAPI {
  constructor(baseUrl = 'http://localhost:8091') {
    this.pb = new PocketBase(baseUrl);
    this.baseUrl = baseUrl;
  }

  // Authentication Methods
  async registerUser(userData) {
    try {
      const user = await this.pb.collection('users').create({
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
      await this.pb.collection('users').authWithPassword(userData.email, userData.password);

      // Create artisan profile if role is artisan
      if (userData.role === 'artisan') {
        await this.createArtisanProfile(user.id, {
          skill: userData.skill || 'General Services',
          rate: userData.rate || 5000,
          availability: 'Available',
          rating: 0,
          completed_jobs: 0
        });
      }

      return this.pb.authStore.model;
    } catch (error) {
      console.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed');
    }
  }

  async loginUser(email, password) {
    try {
      await this.pb.collection('users').authWithPassword(email, password);
      
      // Update last seen
      await this.pb.collection('users').update(this.pb.authStore.model.id, {
        last_seen: new Date().toISOString()
      });

      return this.pb.authStore.model;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid email or password');
    }
  }

  async logout() {
    this.pb.authStore.clear();
  }

  getCurrentUser() {
    return this.pb.authStore.model;
  }

  isAuthenticated() {
    return this.pb.authStore.isValid;
  }

  // User Profile Methods
  async updateUserProfile(userId, updates) {
    try {
      const user = await this.pb.collection('users').update(userId, updates);
      return user;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  async uploadAvatar(userId, file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const user = await this.pb.collection('users').update(userId, formData);
      return user;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  }

  getAvatarUrl(user, size = '100x100') {
    if (!user?.avatar) return null;
    return this.pb.files.getUrl(user, user.avatar, { thumb: size });
  }

  async switchUserRole(userId, newRole) {
    try {
      const updates = { role: newRole };
      
      // Create artisan profile if switching to artisan
      if (newRole === 'artisan') {
        const existingProfile = await this.pb.collection('artisan_profiles')
          .getFirstListItem(`user.id = "${userId}"`)
          .catch(() => null);
          
        if (!existingProfile) {
          await this.createArtisanProfile(userId, {
            skill: 'General Services',
            rate: 5000,
            availability: 'Available'
          });
        }
      }

      const user = await this.pb.collection('users').update(userId, updates);
      return user;
    } catch (error) {
      console.error('Role switch failed:', error);
      throw error;
    }
  }

  // Artisan Methods
  async createArtisanProfile(userId, profileData) {
    try {
      const profile = await this.pb.collection('artisan_profiles').create({
        user: userId,
        ...profileData
      });
      return profile;
    } catch (error) {
      console.error('Artisan profile creation failed:', error);
      throw error;
    }
  }

  async getArtisans(page = 1, perPage = 20) {
    try {
      const result = await this.pb.collection('users').getList(page, perPage, {
        filter: 'role = "artisan"',
        expand: 'artisan_profiles_via_user',
        sort: '-premium,-created'
      });

      return result.items.map(user => this.formatArtisanData(user));
    } catch (error) {
      console.error('Failed to get artisans:', error);
      throw error;
    }
  }

  async getArtisanById(artisanId) {
    try {
      const artisan = await this.pb.collection('users').getOne(artisanId, {
        expand: 'artisan_profiles_via_user'
      });
      
      return this.formatArtisanData(artisan);
    } catch (error) {
      console.error('Failed to get artisan:', error);
      throw error;
    }
  }

  async searchArtisans(query, city = '', page = 1, perPage = 20) {
    try {
      let filter = 'role = "artisan"';
      
      if (query) {
        filter += ` && (name ~ "${query}" || artisan_profiles_via_user.skill ~ "${query}")`;
      }
      
      if (city) {
        filter += ` && location = "${city}"`;
      }

      const result = await this.pb.collection('users').getList(page, perPage, {
        filter,
        expand: 'artisan_profiles_via_user',
        sort: '-premium,-created'
      });

      return result.items.map(user => this.formatArtisanData(user));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }

  formatArtisanData(user) {
    const profile = user.expand?.artisan_profiles_via_user?.[0];
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      location: user.location,
      premium: user.premium,
      photo: user.avatar ? this.getAvatarUrl(user, '300x300') : null,
      skill: profile?.skill || 'General Services',
      specialties: profile?.specialties || [],
      description: profile?.description || '',
      rate: profile?.rate || 0,
      rating: profile?.rating || 0,
      yearsExperience: profile?.years_experience || 0,
      availability: profile?.availability || 'Available',
      completedJobs: profile?.completed_jobs || 0,
      created: user.created,
      updated: user.updated
    };
  }

  // Booking Methods
  async createBooking(bookingData) {
    try {
      const reference = 'NACO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const booking = await this.pb.collection('bookings').create({
        client: this.pb.authStore.model.id,
        artisan: bookingData.artisanId,
        service: bookingData.service,
        description: bookingData.notes || bookingData.description,
        service_date: bookingData.date,
        service_time: bookingData.time,
        amount: bookingData.amount,
        payment_method: bookingData.payment,
        status: 'pending',
        location: bookingData.location || '',
        reference
      });

      // Create notification for artisan
      await this.createNotification(bookingData.artisanId, {
        type: 'booking',
        title: 'New Booking Request',
        message: `You have a new booking request for ${bookingData.service}`,
        data: { bookingId: booking.id }
      });

      return booking;
    } catch (error) {
      console.error('Booking creation failed:', error);
      throw error;
    }
  }

  async getUserBookings(userId, page = 1, perPage = 20) {
    try {
      const result = await this.pb.collection('bookings').getList(page, perPage, {
        filter: `client.id = "${userId}" || artisan.id = "${userId}"`,
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
        clientName: booking.expand?.client?.name,
        artisanName: booking.expand?.artisan?.name,
        created: booking.created
      }));
    } catch (error) {
      console.error('Failed to get bookings:', error);
      throw error;
    }
  }

  async updateBookingStatus(bookingId, status) {
    try {
      const booking = await this.pb.collection('bookings').update(bookingId, { status });
      
      // Create notification for relevant parties
      const notificationData = {
        type: 'booking',
        title: `Booking ${status}`,
        message: `Your booking has been ${status}`,
        data: { bookingId }
      };

      // Notify client if status changed by artisan
      if (['confirmed', 'declined', 'completed'].includes(status)) {
        await this.createNotification(booking.client, notificationData);
      }

      return booking;
    } catch (error) {
      console.error('Booking status update failed:', error);
      throw error;
    }
  }

  // Review Methods
  async createReview(reviewData) {
    try {
      const review = await this.pb.collection('reviews').create({
        booking: reviewData.bookingId,
        reviewer: this.pb.authStore.model.id,
        artisan: reviewData.artisanId,
        rating: reviewData.rating,
        text: reviewData.text
      });

      // Update artisan's average rating
      await this.updateArtisanRating(reviewData.artisanId);

      return review;
    } catch (error) {
      console.error('Review creation failed:', error);
      throw error;
    }
  }

  async getReviewsForArtisan(artisanId, page = 1, perPage = 10) {
    try {
      const result = await this.pb.collection('reviews').getList(page, perPage, {
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
      throw error;
    }
  }

  async updateArtisanRating(artisanId) {
    try {
      // Calculate average rating
      const reviews = await this.pb.collection('reviews').getFullList({
        filter: `artisan.id = "${artisanId}"`
      });

      if (reviews.length > 0) {
        const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        
        // Update artisan profile
        const profile = await this.pb.collection('artisan_profiles')
          .getFirstListItem(`user.id = "${artisanId}"`);
          
        await this.pb.collection('artisan_profiles').update(profile.id, {
          rating: Math.round(avgRating * 10) / 10 // Round to 1 decimal place
        });
      }
    } catch (error) {
      console.error('Failed to update artisan rating:', error);
    }
  }

  // Notification Methods
  async createNotification(userId, notificationData) {
    try {
      const notification = await this.pb.collection('notifications').create({
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
      throw error;
    }
  }

  async getNotifications(userId, page = 1, perPage = 20) {
    try {
      const result = await this.pb.collection('notifications').getList(page, perPage, {
        filter: `user.id = "${userId}"`,
        sort: '-created'
      });

      return result.items;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  async markNotificationsRead(userId) {
    try {
      const notifications = await this.pb.collection('notifications').getFullList({
        filter: `user.id = "${userId}" && read = false`
      });

      for (const notification of notifications) {
        await this.pb.collection('notifications').update(notification.id, { read: true });
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  }

  // Favorites Methods
  async toggleFavorite(artisanId) {
    try {
      const userId = this.pb.authStore.model.id;
      
      // Check if favorite exists
      const existing = await this.pb.collection('favorites')
        .getFirstListItem(`user.id = "${userId}" && artisan.id = "${artisanId}"`)
        .catch(() => null);

      if (existing) {
        // Remove favorite
        await this.pb.collection('favorites').delete(existing.id);
        return false;
      } else {
        // Add favorite
        await this.pb.collection('favorites').create({
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

  async getUserFavorites(userId, page = 1, perPage = 20) {
    try {
      const result = await this.pb.collection('favorites').getList(page, perPage, {
        filter: `user.id = "${userId}"`,
        expand: 'artisan,artisan.artisan_profiles_via_user'
      });

      return result.items.map(fav => this.formatArtisanData(fav.expand.artisan));
    } catch (error) {
      console.error('Failed to get favorites:', error);
      throw error;
    }
  }

  // File Upload Helpers
  async uploadFile(collection, recordId, fieldName, file) {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);

      const record = await this.pb.collection(collection).update(recordId, formData);
      return record;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  getFileUrl(record, filename, thumb = null) {
    return this.pb.files.getUrl(record, filename, thumb ? { thumb } : {});
  }

  // Real-time subscriptions (optional)
  subscribeToBookings(userId, callback) {
    return this.pb.collection('bookings').subscribe(`client.id = "${userId}" || artisan.id = "${userId}"`, callback);
  }

  subscribeToNotifications(userId, callback) {
    return this.pb.collection('notifications').subscribe(`user.id = "${userId}"`, callback);
  }

  unsubscribe(subscription) {
    this.pb.collection.unsubscribe(subscription);
  }
}

// Export the API class
export default NacoPocketBaseAPI;

