const jwt = require('jsonwebtoken');
const kate = "wowzaeiei";

const teacher_auth = async(req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.redirect('/login');
        }
        const decode = jwt.verify(token, kate);
        req.teacher = decode;
        next();
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}

const student_auth = async(req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.redirect('/login');
        }
        const decode = jwt.verify(token, kate);
        req.student = decode;
        next();
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}

const admin_auth = async(req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.redirect('/login');
        }
        const decode = jwt.verify(token, kate);
        req.admin = decode;
        next();
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}

const regis_auth = async(req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.redirect('/login');
        }
        const decode = jwt.verify(token, kate);
        req.registration = decode;
        next();
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}

module.exports = { teacher_auth, student_auth, admin_auth, regis_auth };