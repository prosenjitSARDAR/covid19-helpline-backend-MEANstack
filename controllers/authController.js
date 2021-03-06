const authService = require('../services/authService');
const PROVIDER = require('../models/Provider');
const RESOURCE = require('../models/Resource');
const createError = require('http-errors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthController {

    constructor() {
        this.authService = new authService();
    }

    //REGISTRATION
    async registration(req, res, next) {
        try {
            if (!req.body || !req.body.name || !req.body.email || !req.body.password || !req.body.resourceName || !req.body.category || !req.body.address || !req.body.city || !req.body.pincode || !req.body.contact_number) {
                return res.status(400).send({ errors: "Invalid request! some required data is missing", success: false })
            }

            let { name, email, password } = req.body;

            //CHECKING EMAIL EXIST OR NOT
            const isEmailExist = await this.authService.isEmailExistCheck(email);
            if (isEmailExist == true) {
                return res.status(409).send({ errors: "Email already exist", success: false });
            }

            //HASHING PASSWORD
            const hashedPassword = await bcrypt.hash(password, 10);

            //CREATE PROVIDER
            const Provider = await this.authService.createProvider(req.body, hashedPassword);
            if (!Provider) {
                return res.status(500).send({ errors: "Something wrong happened. Please try again later.", success: false });
            } else {

                //CREATE RESOURCE
                const Resource = await this.authService.createResource(req.body, Provider._id);
                if (!Resource) {
                    return res.status(500).send({ errors: "Something wrong happened. Please try again later.", success: false });
                } else {

                    //INSERT RESOURE_ID INTO PROVIDER COLLECTION
                    this.authService.insertResourceIdIntoProvider(Resource._id, Provider._id).then((result) => {
                        return res.status(201).send({ message: "Congratulations! Registration successfull", success: true })
                    })
                }
            }

        } catch (err) {
            console.log(err);
            if (err.name === 'ValidationError') {
                next(createError(422, err.message));
                return;
            }
            next(err);
        }
    }

    //LOGIN
    async login(req, res, next) {
        try {
            let { email, password } = req.body;

            //Check email exist in DB or not
            const provider = await PROVIDER.findOne({ email })

            if (provider) {
                //Comparing Password
                bcrypt.compare(password, provider.password, (err, result) => {
                    if (err) {
                        //IF something went wrong or any error happen
                        throw createError.Unauthorized("Sorry! Something went wrong. Please try again later");

                    } else if (result == true) {
                        //If email id & password match
                        let token = jwt.sign({ email: provider.email, _id: provider._id }, process.env.JWT_KEY, { expiresIn: '3h' });

                        return res.status(200).send({ message: "Welcome! Authentication successfull", success: true, token: token });

                    } else {
                        //If Email or Password not match
                        return res.status(403).send({ errors: "Incorrect email or Password. Please try again", success: false });

                    }
                })

            } else {
                //If email id does not exist in DB
                throw createError.Unauthorized("Incorrect email or Password. Please try again")
            }

        } catch (err) {
            console.log(err);
            if (err.name === 'ValidationError') {
                next(createError(422, err.message));
                return;
            }
            next(err);
        }
    }


    async changePassword(req, res, next) {
        try {
            const { _id, password } = req.currentUser;
            const { currentPassword, newPassword, confirmPassword } = req.body;

            if (newPassword == confirmPassword) {

                //HASHING NEW PASSWORD
                const hashedPassword = await bcrypt.hash(newPassword, 10);

                //Comparing Password
                bcrypt.compare(currentPassword, password, (err, result) => {
                    if (err) {
                        //IF something went wrong or any error happen
                        throw createError.Unauthorized("Sorry! Something went wrong. Please try again later");

                    } else if (result == true) {
                        //If password match
                        this.authService.saveNewPassword(_id, hashedPassword).then(result => {
                            return res.status(201).send({ message: "Done! password has been changed successfully.", success: true });

                        }).catch((error) => {

                        })

                    } else {
                        //If Password not matchhashedPassword
                        return res.status(403).send({ errors: "You've entered wrong password.", success: false });

                    }
                })

            } else {
                return res.status(403).send({ errors: "Entered 'new password' and 'confirm password' does not match", success: false });
            }

        } catch (err) {
            console.log(err);
            if (err.name === 'ValidationError') {
                next(createError(422, err.message));
                return;
            }
            next(err);
        }
    }

}

module.exports = new AuthController