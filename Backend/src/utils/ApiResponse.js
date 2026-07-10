/**
 * Standard API Response Class
 * Har successful response is class se jayegi
 */
class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode >= 200 && statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Static helper - 200 OK
   */
  static ok(data, message = 'Success') {
    return new ApiResponse(200, data, message);
  }

  /**
   * Static helper - 201 Created
   */
  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  /**
   * Response bhejne ka method
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
