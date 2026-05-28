const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://booking-backend-final.onrender.com/api/v1';

export interface FlightSearchParams {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export interface BookingData {
  flightId: string;
  cabinClass: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    passportNumber: string;
    nationality: string;
    seatNumber: string;
    mealPreference?: string;
  }>;
}

export interface PaymentData {
  bookingId: string;
  paymentMethod: string;
  provider: string;
}

class ApiService {
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // Auto-refresh token on 401
  private async fetchWithRefresh(url: string, options: RequestInit, token?: string): Promise<Response> {
    const response = await fetch(url, options);

    if (response.status === 401 && token) {
      // Try to refresh
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            const newToken = data.data.accessToken;
            localStorage.setItem('accessToken', newToken);
            // Retry original request with new token
            const retryOptions = {
              ...options,
              headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
            };
            return fetch(url, retryOptions);
          }
        } catch {
          // Refresh failed - clear auth
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    return response;
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      let message = 'Request failed';
      try {
        const data = await response.json();
        message = data.message || data.errors?.[0]?.message || message;
      } catch {}
      throw new Error(message);
    }
    return response.json();
  }

  // Flight APIs
  async searchFlights(params: FlightSearchParams, token?: string) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') queryParams.set(k, String(v));
    });
    const response = await fetch(`${API_BASE_URL}/flights/search?${queryParams}`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getFlightDetails(flightId: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}/flights/${flightId}`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getSeatAvailability(flightId: string, token?: string) {
    const response = await fetch(`${API_BASE_URL}/flights/${flightId}/seats`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse(response);
  }

  async getAirports() {
    const response = await fetch(`${API_BASE_URL}/flights/airports`);
    return this.handleResponse(response);
  }

  // Booking APIs
  async createBooking(data: BookingData, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/bookings`,
      { method: 'POST', headers: this.getHeaders(token), body: JSON.stringify(data) },
      token
    );
    return this.handleResponse(response);
  }

  async getBooking(bookingId: string, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/bookings/${bookingId}`,
      { headers: this.getHeaders(token) },
      token
    );
    return this.handleResponse(response);
  }

  async getUserBookings(token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/bookings`,
      { headers: this.getHeaders(token) },
      token
    );
    return this.handleResponse(response);
  }

  async cancelBooking(bookingId: string, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/bookings/${bookingId}/cancel`,
      { method: 'PUT', headers: this.getHeaders(token) },
      token
    );
    return this.handleResponse(response);
  }

  // Payment APIs
  async initiatePayment(data: PaymentData, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/payments/initiate`,
      { method: 'POST', headers: this.getHeaders(token), body: JSON.stringify(data) },
      token
    );
    return this.handleResponse(response);
  }

  async confirmPayment(paymentIntentId: string, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/payments/confirm`,
      { method: 'POST', headers: this.getHeaders(token), body: JSON.stringify({ paymentIntentId }) },
      token
    );
    return this.handleResponse(response);
  }

  async getPaymentDetails(bookingId: string, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/payments/${bookingId}`,
      { headers: this.getHeaders(token) },
      token
    );
    return this.handleResponse(response);
  }

  async requestRefund(bookingId: string, token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/payments/refund/${bookingId}`,
      { method: 'POST', headers: this.getHeaders(token) },
      token
    );
    return this.handleResponse(response);
  }

  // Analytics APIs (admin)
  async getAnalytics(token: string) {
    const response = await this.fetchWithRefresh(
      `${API_BASE_URL}/bookings/admin/analytics`,
      { headers: this.getHeaders(token) },
      token
    );
    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();
