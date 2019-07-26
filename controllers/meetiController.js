const Grupos = require('../models/Grupos');
const Meeti = require('../models/Meeti');

const uuid = require('uuid/v4');


// Muestra el formulario para nuevos Meeti
exports.formNuevoMeeti = async (req, res) => {
    const grupos = await Grupos.findAll({
        where: {
            usuarioId: req.user.id
        }
    });
    res.render('nuevo-meeti', {
        nombrePagina: 'Crear Nuevo Meeti',
        grupos
    })
}

// Inserta neuvos Meetis en la Base de Datos
exports.crearMeeti = async (req, res) => {
    // Obtener los datos
    const meeti = req.body;
    //console.log(meeti);

    // Asignar el usuario
    meeti.usuarioId = req.user.id;

    // Almacena la ubicación con un point
    const point = {
        type: 'Point', coordinates: [parseFloat (req.body.lat), parseFloat (req.body.lng) ]
    };
    meeti.ubicacion = point;

    // El cupo es opcional
    if(req.body.cupo === '') {
        meeti.cupo == 0;
    }

    meeti.id = uuid();

    // Almacenar en la base de datos

    try {
        await Meeti.create(meeti);
        req.flash('exito', 'Se ha creado el Meeti Correctamente');
        res.redirect('/administracion');
    } catch (error) {
        const erroresSequelize = error.errors.map(err => err.message);
        req.flash('error', erroresSequelize);
        res.redirect('/nuevo-meeti');   
    }   
}

// Sanitiza los meeti
exports.sanitizarMeeti = (req, res, next) => {
    req.sanitizeBody('titulo');
    req.sanitizeBody('invitado');
    req.sanitizeBody('cupo');
    req.sanitizeBody('fecha');
    req.sanitizeBody('hora');
    req.sanitizeBody('direccion');
    req.sanitizeBody('ciudad');
    req.sanitizeBody('estado');
    req.sanitizeBody('pais');
    req.sanitizeBody('lat');
    req.sanitizeBody('lng');
    req.sanitizeBody('grupoId');

    next();
}

// Muestra el formulario para editar un Meeti
exports.formEditarMeeti = async (req, res, next) => {
    const consultas = [];
    consultas.push( Grupos.findAll({ where: { usuarioId : req.user.id }}));
    consultas.push( Meeti.findByPk(req.params.id));

    // Retorna un Promise
    const [ grupos, meeti ] = await Promise.all(consultas);

    if(!grupos || !meeti) {
        req.flash('error', 'operación no Válida');
        res.redirect('/administracion');
        return next();
    }

    // Mostramos la vista
    res.render('editar-meeti', {
        nombrePagina: `Editar Meeti: ${meeti.titulo}`,
        grupos,
        meeti
    })
}

// Almacena los cambios en el meeti
exports.editarMeeti = async (req, res, next) => {
    const meeti = await Meeti.findOne({ where : {id: req.params.id, usuarioId : req.user.id }});

    if(!meeti) {
        req.flash('error', 'operación no Válida');
        res.redirect('/administracion');
        return next();
    }

    // Asignar los valores
    const {grupoId, titulo, invitado, fecha, hora, cupo, 
        descripcion, direccion, ciudad, estado, pais, lat, lng} = req.body;
    
        meeti.grupoId = grupoId;
        meeti.titulo = titulo;
        meeti.invitado = invitado;
        meeti.fecha = fecha;
        meeti.hora = hora;
        meeti.cupo = cupo;
        meeti.descripcion = descripcion;
        meeti.direccion = direccion;
        meeti.ciudad = ciudad;
        meeti.estado = estado;
        meeti.pais = pais;
    
    // Asignar el point
    const point = {type: 'Point', coordinates: [parseFloat(lat), parseFloat(lng)]};

    meeti.ubicacion = point;

    // Almacenar en la BD
    await meeti.save();
    req.flash('exito', 'Cambios guardados correctamente');
    res.redirect('/administracion');
} 

// Muestra un formulario para eliminar meetis
exports.formEliminarMeeti = async (req, res, next) => {
    const meeti = await Meeti.findOne({ where: {id: req.params.id, usuarioId:  req.user.id }});

    if(!meeti) {
        req.flash('error', 'operación no Válida');
        res.redirect('/administracion');
        return next();
    }

    // Mostramos la vista
    res.render('eliminar-meeti', {
        nombrePagina: `Eliminar Meeti: ${meeti.titulo}`
    })
}

// Elimina el Meeti de la BD
exports.eliminarMeeti = async (req, res) => {
    await Meeti.destroy({ where: {id: req.params.id} });

    req.flash('exito', 'Meeti Eliminado');
    res.redirect('/administracion');
}