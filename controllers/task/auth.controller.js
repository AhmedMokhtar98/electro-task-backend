// Coach Backend
// controllers/admin/auth.controller.js
const coachService = require( "../../services/stakeholder/coach.service" );

/* =========================================================
   LOGIN
========================================================= */

exports.login = async (req, res) => {
  const resultOperation = await coachService.login(req.body);
  return res .status(resultOperation.code || 200) .json(resultOperation);
};

/* =========================================================
   REFRESH TOKEN
========================================================= */

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  const resultOperation = await coachService.refreshToken( refreshToken );

  return res .status(resultOperation.code || 200) .json(resultOperation);
};

/* =========================================================
   FORGOT PASSWORD
========================================================= */

exports.forgotPassword = async ( req, res ) => {
  const resultOperation = await coachService.forgotPassword( req.body );
  return res .status( resultOperation.code || 200 ) .json( resultOperation );
};
/* =========================================================
   RESET PASSWORD
========================================================= */

exports.resetPassword = async (req, res) => {
  const resultOperation = await coachService.resetPassword( req.body );
  return res .status(resultOperation.code || 200) .json(resultOperation);
};



/* =========================================================
   GET PROFILE
========================================================= */

exports.getProfile = async ( req, res ) => { 
        const authorization = req.headers.authorization; 
        const resultOperation = await coachService.getProfile( authorization ); 
        return res .status( resultOperation.code || 200 ) .json( resultOperation ); 
};


/* =========================================================
   UPDATE PROFILE
========================================================= */

exports.updateProfile = async ( req, res ) => {
  const authorization = req.headers.authorization;
  const resultOperation = await coachService.updateProfile( authorization, req.body );
  return res .status( resultOperation.code || 200 ) .json( resultOperation );
};