const jwt = require('jsonwebtoken');
const kate = "wowzaeiei"; // 🌟 รหัสลับตรงนี้ต้องตรงกับในไฟล์ index.js นะครับ

// ฟังก์ชันสำหรับตรวจสอบทั้ง "การล็อกอิน" และ "Role" ว่าตรงกันไหม
const verifyTokenAndRole = (allowedRole, reqKey) => {
    return (req, res, next) => {
        const token = req.cookies.accessToken;
        
        // 1. ถ้าไม่มี Token (ยังไม่ล็อกอิน) ให้เด้งไปหน้าแรก
        if (!token) {
            return res.redirect('/');
        }

        jwt.verify(token, kate, (err, decoded) => {
            // 2. ถ้า Token ผิด หรือหมดอายุ ให้เด้งไปหน้าแรก
            if (err) {
                return res.redirect('/');
            }

            // 🌟 3. จุดสำคัญ: ตรวจสอบ Role ว่าตรงกับหน้าที่อนุญาตไหม!
            if (decoded.role !== allowedRole) {
                // ถ้าสิทธิ์ไม่ตรง (เช่น นักเรียน แอบเข้าหน้า อาจารย์) ให้เด้งกลับไปหน้าหลักของตัวเอง
                if (decoded.role === 'student') return res.redirect('/student/home');
                if (decoded.role === 'teacher') return res.redirect('/home');
                if (decoded.role === 'admin') return res.redirect('/home');
                if (decoded.role === 'registration') return res.redirect('/home');
                return res.redirect('/'); 
            }

            // 4. ถ้าผ่านหมด (ล็อกอินแล้ว + Role ตรง) ให้แนบข้อมูลลง req แล้วไปต่อ
            req[reqKey] = decoded;
            next();
        });
    };
};

module.exports = {
    // แยกสิทธิ์ให้แต่ละหน้าชัดเจน
    teacher_auth: verifyTokenAndRole('teacher', 'teacher'),
    student_auth: verifyTokenAndRole('student', 'student'),
    admin_auth: verifyTokenAndRole('admin', 'admin'),
    regis_auth: verifyTokenAndRole('registration', 'registration'),
    
    // general_auth ใช้สำหรับหน้า /home (แอดมิน ทะเบียน อาจารย์ เข้าได้ แต่นักเรียนเข้าไม่ได้)
    general_auth: (req, res, next) => {
        const token = req.cookies.accessToken;
        if (!token) return res.redirect('/');
        
        jwt.verify(token, kate, (err, decoded) => {
            if (err) return res.redirect('/');
            
            // 🌟 กันนักเรียนไม่ให้หลงเข้ามาหน้า /home ของผู้ใหญ่
            if (decoded.role === 'student') {
                return res.redirect('/student/home'); 
            }
            
            req.user = decoded;
            next();
        });
    }
};