const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const path = require('path')

const app = express();
app.use(express.json());
app.use(cors(
    {
        origin: ["http://localhost:3001"],
        // AccessControlAllowOrigin: ["http://localhost:3000/"],
        methods: ["POST","GET","PUT","DELETE"],
        credentials: true
    }
));
app.use(cookieParser());
app.use(express.static('public'));

//Cross-Origin Resource Sharing -> CORS 

const con = mysql.createConnection({host: 'localhost',user: 'root',password: '',database: 'EmployeeDB',});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '_' + Date.now() + path.extname(file.originalname));
    }
})

const upload = multer({
    storage: storage,
})

con.connect(function(err){
    if(err){
        console.log('Error in connection')
    }else{
        console.log('Connected to DB.')
    }
});

app.get('/getEmployee', (req,res) => {
    const sql = "SELECT * FROM employee";
    con.query(sql, (err, result) =>{
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
});

app.get('/getAdmin', (req,res) => {
    const sql = "SELECT * FROM users";
    con.query(sql, (err, result) =>{
        if(err) return res.json({Error: "Get admin error in sql"});
        return res.json({Status: "Success", Result: result})
    })
});

app.get('/get/:id', (req,res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM employee WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Error: "Get employee error in sql"});
        return res.json({Status: "Success", Result: result})
    })
});

app.get('/getad/:id', (req,res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM users WHERE id = ?";
    con.query(sql, [id], (err, result) => {
        if(err) return res.json({Error: "Get admin error in sql"});
        return res.json({Status: "Success", Result: result})
    })
});

app.put('/update/:id', (req, res) => {
    const id = req.params.id;
    const sql = "UPDATE employee set salary = ? WHERE id = ?";
    con.query(sql,[req.body.salary ,id], (err, result) => {
        if(err) return res.json({Error: "Update employee error in sql"});
        return res.json({Status: "Success"})
    })
});

app.delete('/delete/:id', (req,res) => {
    const id = req.params.id;
    const sql = "DELETE FROM employee WHERE id = ?";
    con.query(sql,[id], (err, result) => {
        if(err) return res.json({Error: "Delete employee error in sql"});
        return res.json({Status: "Success"})
    })
});

app.delete('/adminDelete/:id', (req,res) => {
    const id = req.params.id;
    const sql = "DELETE FROM users WHERE id = ?";
    con.query(sql,[id], (err, result) => {
        if(err) return res.json({Error: "Delete admin error in sql"});
        return res.json({Status: "Success"})
    })
});

const verifyUser = (req, res, next) => {
    const token = req.cookies.token;
    if(!token) {
        return res.json({Error: "You are no authenticated"})
    } else {
        jwt.verify(token, "jwt-secret-key", (err, decoded) => {
            if(err) return res.json({Error: "Token wrong"})
            req.role = decoded.role;
            req.id = decoded.id;
            next();
        })
    }
};

app.get('/dashboard', verifyUser, (req, res) => {
    return res.json({Status: "Success", role: req.role, id: req.id})
});

app.get('/adminCount', (req, res) => {
    const sql = "SELECT COUNT(id) as admin FROM users";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Error in running query."})
        return res.json(result);
    })
})

app.get('/employeeCount', (req, res) => {
    const sql = "SELECT COUNT(id) as employee FROM employee";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Error in running query."})
        return res.json(result);
    })
})

app.get('/sumOfSalary', (req, res) => {
    const sql = "SELECT SUM(salary) as salary FROM employee";
    con.query(sql, (err, result) => {
        if(err) return res.json({Error: "Error in running query."})
        return res.json(result);
    })
})

app.post('/login', (req,res) => {
    const sql = 'SELECT * FROM users Where email = ? AND password = ?';
    con.query(sql, [req.body.email, req.body.password], (err, result) => {
        if(err) return res.json({Status: "Error" , Error: 'Error in running query'});
        if(result.length > 0) {
            const id = result[0].id;
            const token = jwt.sign({role: "admin"}, "jwt-secret-key", {expiresIn: '1d'})
            res.cookie('token', token)
            return res.json({Status: "Success"})
        } else{
            return res.json({Status: "Error" , Error: 'Wrong Email or Password'});
        }
    })
});

app.post('/employeelogin', (req,res) => {
    const sql = 'SELECT * FROM employee Where email = ?';
    con.query(sql, [req.body.email], (err, result) => {
        if(err) return res.json({Status: "Error" , Error: 'Error in running query'});
        if(result.length > 0) {
            bcrypt.compare(req.body.password.toString(), result[0].password, (err, response) => {
                if(err) return res.json({Error: "Wrong email or password"})
                
                const token = jwt.sign({role: "employee", id: result[0].id}, "jwt-secret-key", {expiresIn: '1d'})
                res.cookie('token', token)
                return res.json({Status: "Success", id: result[0].id})
            })
        } else{
            return res.json({Status: "Error" , Error: 'Wrong Email or Password'});
        }
    })
});

// app.get('/employee/:id', (req,res) => {
//     const id = req.params.id;
//     const sql = 'SELECT * FROM employee WHERE id = ?';
//     con.query(sql, [id], (err, result) => {
//         if(err) return res.json({Error: "Get employee error in sql"})
//         return res.json({Status: "Success", Result: result})
//     })
// })

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    return res.json({Status: "Success"});
});

app.post('/create', upload.single('image'), (req,res) => {
    const sql = 'INSERT INTO employee (`name`,`email`,`password`,`salary`,`address`,`image`) VALUES (?)';
    bcrypt.hash(req.body.password.toString(), 10, (err, hash) => {
        if(err) return res.json({Error: "Error in hashing password"})
        const values = [
            req.body.name,
            req.body.email,
            hash,
            req.body.salary,
            req.body.address,
            req.file.filename
        ]
        con.query(sql, [values], (err, result) => {
            if(err) return res.json({Error: 'Error inside signup query'});
            return res.json({Status: 'Success'});
        })
    })
});

app.listen(5000, ()=>{
    console.log('NodeApi is running on port 5000')
});