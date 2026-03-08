const jwt = require('jsonwebtoken');
const kate = "wowzaeiei";

const teacher_auth = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.redirect('/login');
        }
        const decode = jwt.verify(token, kate);
        
        // ตรวจสอบว่าต้องเป็น teacher เท่านั้น
        if (decode.role !== 'teacher') {
            return res.status(403).send("สิทธิ์การเข้าถึงเฉพาะอาจารย์เท่านั้น");
        }
        
        req.teacher = decode;
        next();
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}

// เพิ่มส่วนของฝ่ายทะเบียน (Registration)
const regis_auth = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.redirect('/login');
        }
        const decode = jwt.verify(token, kate);
        
        // ตรวจสอบว่าบทบาทต้องเป็น registration
        if (decode.role !== 'registration') {
            return res.status(403).send("สิทธิ์การเข้าถึงเฉพาะฝ่ายทะเบียนเท่านั้น");
        }
        
        req.user = decode; // เก็บข้อมูลลง req.user เพื่อใช้ในหน้า registration
        next();
    } catch (error) {
        console.log(error);
        return res.redirect('/login');
    }
}

// export ออกไปทั้งคู่เพื่อให้ index.js เรียกใช้งานได้
module.exports = { teacher_auth, regis_auth };