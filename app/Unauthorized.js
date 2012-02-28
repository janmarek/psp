function Unauthorized(msg) {
  this.name = 'Unauthorized';
  Error.call(this, msg);
  Error.captureStackTrace(this, arguments.callee);
}

Unauthorized.prototype.__proto__ = Error.prototype;

module.exports = Unauthorized;