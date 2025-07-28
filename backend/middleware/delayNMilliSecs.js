export const delayNMilliSecs = (req, res, next) => {
  console.log('I am here')
  if (!req.query || !req.query.delay) {
    console.log('next')
    return next();
  }
  let n;
  if (!isNaN(req.query.delay) ) {
    n = parseInt(req.query.delay, 10); 
  }
  console.log("delay: ", n );
  if (typeof n !== 'number' || isNaN(n) || n < 0) {
    return res.status(400).json({ error: 'Delay must be a non-negative number'});
  }
  return setTimeout(() => {
      next();
    }, n);
};