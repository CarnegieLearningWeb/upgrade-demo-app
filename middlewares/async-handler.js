// A middleware for handling exceptions inside of async express routes (Note: this won't be needed from Express 5)
const asyncHandler = fn => (req, res, next) => {
    return Promise
        .resolve(fn(req, res, next))
        .catch(next);
};

module.exports = asyncHandler;