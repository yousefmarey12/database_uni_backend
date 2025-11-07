let express = require('express')
let firebase = require('firebase/app')
var cors = require('cors')
let axios = require('axios')
let fs = require('fs')
let uuid = require('uuid')
var admin = require("firebase-admin");
require('dotenv').config();
const { getAuth } = require('firebase-admin/auth');
let { createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
let { getDatabase, ref, onValue, set, get, child } = require("firebase/database");
const e = require('express')
const { applicationDefault } = require('firebase-admin/app')
console.log("hello")
let server = express()
console.log("serviceAccount")

console.log(process.env.project_id)
let app = admin.initializeApp({
    credential: admin.credential.cert({
        project_id: process.env.project_id,
        client_email: process.env.client_email,
        private_key: process.env.private_key.replace(/\\n/g, '\n'),
    }),
    databaseURL: "https://fueproject-edf68-default-rtdb.firebaseio.com",

})
function getChatID(uid1, uid2) {
    if (uid1 > uid2) {
        return uid2 + '_' + uid1
    }
    else {
        return uid1 + '_' + uid2
    }
}

let db = admin.database(app)
let auth = getAuth(app)

server.use(express.json());

server.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});



let user = null

server.post('/signup', (req, res) => {
    console.log("does this run?")
    res.setHeader('Access-Control-Allow-Origin', '*')

    auth.createUser({
        email: req.body.signup_email,
        password: req.body.signup_password
    })
        .then(v => {

            user = v.user
            set(ref(db, 'users/' + v.uid), {
                username: v.email,
                uid: v.uid
            }).then(() => {
                let obj = {
                    email: v.email,
                    uid: v.uid
                }
                let str = JSON.stringify(obj)
                res.send(str)
                signInWithEmailAndPassword(auth, obj.email, req.body.signup_password)
                    .then(v => {
                        user = v.user


                    })
                    .catch(e => {
                        console.log(e)
                    })

            });

        })
        .catch(e => {
            res.writeHead(400)
            console.log(e)
        })


})

server.post('/chat', (req, res) => {
    let dbRef = ref(db)
    id = req.body.id
    let msgObj = {
        email: req.body.email,
        message: req.body.message
    }
    res.setHeader('Access-Control-Allow-Origin', '*')

    get(child(dbRef, `chats/${id}`))
        .then((v) => {
            if (v.exists()) {
                let arr = v.val()

                console.log("my arr")
                if (Array.isArray(arr)) {
                    arr.push(msgObj)
                }
                else {
                    arr = [arr]
                    arr.push(msgObj)
                }


                let str = JSON.stringify(arr)
                set(ref(db, `chats/${id}`), arr)
                    .then(() => {

                        console.log("updated")
                    })
                res.send(str)
                res.end()
            }
            else {
                let arr = [msgObj]
                set(ref(db, `chats/${id}`), arr)
                    .then(() => {

                        console.log("updated")
                    })

                let str = JSON.stringify(arr)

                res.send(str)
                res.end()
            }
        })
})

server.get('/chat/:id', (req, res) => {
    let dbRef = ref(db)
    res.setHeader('Access-Control-Allow-Origin', '*')
    get(child(dbRef, `chats/${req.params.id}`))
        .then((v) => {
            if (v.exists()) {
                let arr = v.val()
                console.log("fasdsa")
                console.log(arr)
                let str = JSON.stringify(arr)
                res.send(str)
                res.end()
            }
            else {
                let str = JSON.stringify([])
                res.send(str)
                res.end()
            }
        })
})



server.get('/users/:id', (req, res) => {
    let dbRef = ref(db)
    console.log("I am in id")
    console.log(req.params.id)
    get(child(dbRef, 'users/' + req.params.id)).then((v) => {
        if (v.exists()) {
            let obj = v.val()
            let str = JSON.stringify(obj)
            res.send(str)
            res.end()
        }
    })
})

server.post('/chats', (req, res) => {
    let dbRef = ref(db)
    let uid = { ...req.body }.uid

    let arr = []

    get(child(ref(db), `users`))
        .then(async (v) => {
            let obj = v.val()

            for (const k in obj) {
                if (uid != k) {
                    console.log("k")
                    console.log(k)
                    console.log(getChatID(uid, k))
                    let id = getChatID(uid, k)
                    let resultArr = await get(child(dbRef, `chats/${id}`)).then(v => {
                        console.log("maybe this runs and throws later?")
                        if (!v.exists()) {
                            let ref = db.ref('chats/')
                            let idRef = ref.child(id)
                            idRef.set({
                                chatID: id
                            })

                            return id
                        }
                        else {
                            console.log("v.val()")
                            return id


                        }
                        console.log("yo my fav v runs")
                        console.log("arr")




                    })
                        .catch((e) => {
                            console.log("ERROR")
                            console.log(e)
                        })

                    arr.push(resultArr)

                }
            }
            let str = JSON.stringify(arr)
            console.log("arrr")
            console.log(arr)
            res.send(str)
            res.end()

        }).then(() => {

        })



})

server.get('/allChats', (req, res) => {
    let dbRef = ref(db)
    get(child(dbRef, `chats`))
        .then((v) => {
            let obj = v.val()
            let arr = []
            for (const k in obj) {
                arr.push(obj[k])
            }
            let str = JSON.stringify(arr)

            res.send(str)
            res.end()
        })
})

server.get('/', (req, res) => {
    fs.readFile('./index.html', { encoding: 'utf-8' }, (err, data) => {
        res.setHeader("content-type", "text/html")
        res.send(data)
        res.end()
    })
})

server.get('/users', (req, res) => {
    let dbRef = ref(db)
    res.setHeader('Access-Control-Allow-Origin', '*')
    get(child(dbRef, `users`)).then((snapshot) => {
        if (snapshot.exists()) {
            let obj = snapshot.val()
            let str = JSON.stringify(obj)
            res.send(str)
            res.end(200)
        } else {
            res.end(200)
        }
    }).catch((error) => {
        console.error(error);
    });

})




server.post('/login', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    signInWithEmailAndPassword(auth, req.body.login_email, req.body.login_password)
        .then(v => {
            user = v.user


        })
        .catch(e => {
            console.log(e)
        })
})
let port = process.env.PORT | 3000
server.listen(port, '0.0.0.0', () => {
    console.log("Server is running on " + port)
})