const Usuarios = require('../models/Usuarios');
const enviarEmail = require('../handlers/emails');

const multer = require('multer');
const shortid = require('shortid');
const fs = require('fs');


const configuracionMulter = {
    limits: { filesize: 200000}, 
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, next) => {
            next(null, __dirname+'/../public/uploads/perfiles/');
        },
        filename: (req, file, next) => {
            const extension = file.mimetype.split('/')[1];
            next(null, `${shortid.generate()}.${extension}`); 
        }
    }),
    fileFilter(req, file, next) {
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            // El formato es válido
            next(null, true);
        } else {
            // El formato NO es válido
            next(new Error('Formato no válido, solo se acepta JPG o PNG'), false);
        }
    } 
};

const upload = multer(configuracionMulter).single('imagen');

// Sube una imagen en el servidor
exports.subirImagen = (req, res, next) => {
    upload(req, res, function(error) {
        if(error) {
            if (error instanceof multer.MulterError) {
                if(error.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error', 'El archivo supera los 200k permitidos');
                } else {
                    req.flash('error', error.message);
                }
            } else if (error.hasOwnProperty('message')) {
                req.flash('error', error.message);
            }
            res.redirect('back');
            return;
            // TODO: Manejar errores 
        } else {
            next();
        }
    })
}

exports.formCrearCuenta = (req, res) => {
    res.render('crear-cuenta', {
        nombrePagina : 'Crea tu Cuenta'
    })
};

exports.crearNuevaCuenta = async (req, res) => {
    const usuario = req.body;

    req.checkBody('confirmar', 'El password no puede ir vacío').notEmpty();
    req.checkBody('confirmar', 'El password es diferente').equals(req.body.password);

    // Leer los errores de express 
    const erroresExpress = req.validationErrors();
    

    try {
        await Usuarios.create(usuario);

        // URL de confirmación
        const url = `http://${req.headers.host}/confirmar-cuenta/${usuario.email}`

        // Enviar email de confirmación
        await enviarEmail.enviarEmail({
            usuario,
            url,
            subject: 'Confirma tu cuenta de Meeti',
            archivo: 'confirmar-cuenta'
        })

        // flash message y redireccionar
        req.flash('exito', 'Hemos enviado un email, confirma tu cuenta');
        res.redirect('/iniciar-sesion');
        
    } catch (error) {

        // Extraer el message de los errores
        const  erroresSequelize = error.errors.map(err => err.message);
        
        // Extraer el msg de los errores
        const errExp = erroresExpress.map(err => err.meg);

        // Unirlos
        const listaErrores = [...erroresSequelize, ...errExp];


        req.flash('error', listaErrores);
        res.redirect('/crear-cuenta');
    }
}

// Confirma la suscripción del usuario
exports.confirmarCuenta = async (req, res, next) => {
    // Verificar que el usuario existe
    const usuario = await Usuarios.findOne({ where: { email: req.params.correo}});
    
    // No existe => redireccionar
    if(!usuario) {
        req.flash('error', 'No existe esa cuenta');
        res.redirect('/crear-cuenta');
        return next();
    }
    // Si existe, confirmarsuscripción y redireccionar
    usuario.activo = 1;
    usuario.save();

    req.flash('exito', 'La cuenta se ha confirmado, ya puedes iniciar sesión');
    res.redirect('/iniciar-sesion');
}

// Formulario para iniciar sesión
exports.formIniciarSesion = (req, res) => {
    res.render('iniciar-sesion', {
        nombrePagina : 'iniciar Sesión'
    })
};

// Muestra el formulario para editar el perfil
exports.formEditarPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);
    
    res.render('editar-perfil', {
        nombrePagina: 'Editar Perfil',
        usuario
    });
}

// Almacena en la base de datos los cambios al perfil
exports.editarPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    req.sanitizeBody('nombre');
    req.sanitizeBody('email');

    // Leer datos del form
    const { nombre, descripcion, email } = req.body;

    // Asignar los valores
    usuario.nombre = nombre;
    usuario.descripcion = descripcion;
    usuario.email = email;

    // Guardar en la BD
    await usuario.save();
    req.flash('exito', 'El perfil se guardó correctamente');
    res.redirect('/administracion');
}

// Muestra el formulario para Cambiar Password
exports.formCambiarPassword = (req, res) => {
    res.render('cambiar-password', {
        nombrePagina: 'Cambiar Password'
    })
}

// Revisa si el password anterior es correcto y lo modifica por uno nuevo
exports.cambiarPassword = async (req, res, next) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    // Verificar que el password actual sea el correcto
        if(!usuario.validarPassword(req.body.anterior)) {
            req.flash('error', 'El password Actual es Incorrecto');
            res.redirect('/administracion');
            return next();
        }

    // Si el password es correcto hashear el nuevo
        const hash = usuario.hashPassword(req.body.nueva);

    // Asignar el password hasheado al usuario
        usuario.password = hash;

    // Guardar en la base de datos
    await usuario.save();

    // Redireccionar
    req.logout();
    req.flash('exito', 'Password Modificado Correctamente, vuelve a Iniciar Sesion')
    res.redirect('/iniciar-sesion');
}

// Muestra el formulario para una imagen de perfil
exports.formSubirImagenPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);

    // Mostrar la vista
    res.render('imagen-perfil', {
        nombrePagina: 'Subir Imagen de Perfil',
        usuario
    })
}

// Guarda la imagen nueva, elimina la anterior (si existe) y guarda el registro en la BD
exports.guardarImagenPerfil = async (req, res) => {
    const usuario = await Usuarios.findByPk(req.user.id);
    
    // Si hay imagen anterior y nueva, vamos a borrar la anterior
    if(req.file && usuario.imagen) {
        const imagenAnteriorPath = __dirname + `/../public/uploads/perfiles/${usuario.imagen}`;

        // Eliminar el archivo con fs Filesystem
        fs.unlink(imagenAnteriorPath, (error) => {
            if(error) {
                console.log(error);
            }
            return;
        })
    }

    // Si hay una imagen nueva la guardamos
       if(req.file){
        usuario.imagen = req.file.filename;
    }

     // Guardar en la DB
     await usuario.save();
     req.flash('exito', 'Cambios Almacenados Correctamente');
     res.redirect('/administracion');
}