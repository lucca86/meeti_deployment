const Categorias = require('../models/Categorias');
const Grupos = require('../models/Grupos');

const multer = require('multer');
const shortid = require('shortid');
const fs = require('fs');
const uuid = require('uuid/v4');


const configuracionMulter = {
    limits: { filesize: 200000}, 
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, next) => {
            next(null, __dirname+'/../public/uploads/grupos/');
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

exports.formNuevoGrupo = async (req, res) => {
    const categorias = await Categorias.findAll();
    res.render('nuevo-grupo', {
        nombrePagina: 'Crea un NuevoGrupo',
        categorias
    })
}

// Almacena los grupos en la DB
exports.crearGrupo = async (req, res) => {

    // Sanitizar los campos
    req.sanitizeBody('nombre');
    req.sanitizeBody('url');

    const grupo = req.body;

    // Almacena el usuario autenticado como el creador del grupo 
    grupo.usuarioId = req.user.id;
    //grupo.categoriaId = req.body.categoria;

    // Leer la imagen
    if(req.file) {
        grupo.imagen = req.file.filename;
    }
    
    grupo.id = uuid();

   try {
       // Almacenar el grepo en la base de datos
       await Grupos.create(grupo);
       req.flash('exito', 'Se ha creado el grupo correctamente');
       res.redirect('/administracion');
   } catch (error) {
       
        // Extraer los errores de Sequelize
        const erroresSequelize = error.errors.map(err => err.message);

        req.flash('error', erroresSequelize);
        res.redirect('/nuevo-grupo');
   }
}

exports.formEditarGrupo = async (req, res) => {
    const consultas = [];
    consultas.push( Grupos.findByPk(req.params.grupoId));
    consultas.push( Categorias.findAll());
    
    // Promise con await
    const [grupo, categorias] = await Promise.all(consultas);

    res.render('editar-grupo', {
        nombrePagina: `Editar Grupo: ${grupo.nombre}`,
        grupo,
        categorias
    })
}

// Guarda los cambios en la Base de Datos
exports.editarGrupo = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});

    // Si no existe ese grupo o no es le dueño
    if(!grupo) {
        req.flash('error', 'Operación No Válida');
        res.redirect('/administracion');
        return next();
    }
    // Todo bien, leer los valores
    const { nombre, descripcion, categoriaId, url} = req.body;

    // Asignar los valores
    grupo.nombre = nombre;
    grupo.descipcion = descripcion;
    grupo.categoriaId = categoriaId;
    grupo.url = url;

    // Guardamos en la Base de Datos
    await grupo.save();
    req.flash('exito', 'Cambios Almacenados Correctamente');
    res.redirect('/administracion');
}

// Muestra un formulario para editar la Imagen del Grupo
exports.formEditarImagen = async (req, res) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});

    res.render('imagen-grupo', {
        nombrePagina: `Editar Imagen Grupo: ${grupo.nombre}`,
        grupo
    })
}

// Modifica la imagen en la Base de Datos y elimina la anterior
exports.editarImagen = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});
    
    // EL grupo existe y es válido    
    if (!grupo) {
        req.flash('error', 'Operación no Válida');
        res.redirect('/iniciar-sesion');
        return next();
    }

    // Verificar que el archivo sea nuevo
    if(req.file) {
        console.log(req.file.filename);
    }

    // Revisarque exista un archivo anterior
    if(grupo.imagen) {
        console.log(grupo.imagen);
    }

    // Si hay imagen anterior y nueva, vamos a borrar la anterior
    if(req.file && grupo.imagen) {
        const imagenAnteriorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;

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
        grupo.imagen = req.file.filename;
    }

    // Guardar en la DB
    await grupo.save();
    req.flash('exito', 'Cambios Almacenados Correctamente');
    res.redirect('/administracion');
}

// Muestra el formulario para eliminar un grupo
exports.formEliminarGrupo = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : {id : req.params.grupoId, usuarioId : req.user.id }});

    if(!grupo) {
        req.flash('error', 'Operación no Válida');
        ReadableStream.redirect('/administracion');
        return next();
    }
    //  Todo bien, ejecutar la vista
    res.render('eliminar-grupo', {
        nombrePagina : `Eliminar grupo: ${grupo.nombre}`
    })
}

// Eliminael grupo y la imagen
exports.eliminarGrupo = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : {id : req.params.grupoId, usuarioId : req.user.id }});

    // Si hay una imagen, eliminarla
    if(grupo.imagen) {
        const imagenAnteriorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;

        // Eliminar el archivo con fs Filesystem
        fs.unlink(imagenAnteriorPath, (error) => {
            if(error) {
                console.log(error);
            }
            return;
        })
    }

    // Eliminar el gruipo
    await Grupos.destroy({
        where: {
            id: req.params.grupoId
        }
    });

    // Redireccionar
    req.flash('exito', 'Grupo Eliminado');
    res.redirect('/administracion');
}