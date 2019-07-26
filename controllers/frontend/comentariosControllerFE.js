const Comentarios = require('../../models/Comentarios');
const Meeti = require('../../models/Meeti');

exports.agregarComentario = async (req, res, next) => {
    // Obtener el comentario
    const { comentario } = req.body; 
    
    // Crear el comentario en la DB
    await Comentarios.create({
        mensaje: comentario,
        usuarioId: req.user.id,
        meetiId: req.params.id
    });

    // Redireccionar al usuario a la misma página
    res.redirect('back');
    next();
}

// Elimina un comentario de la base de datos
exports.eliminarComentario = async (req, res, next) => {
    
    // Tomar el ID del comentario
    const { comentarioId } = req.body;
    
    // Consultar a la DB porel comentario
    const comentario = await Comentarios.findOne({ where: { id: comentarioId }});
    
    // Verificar si existe el comentario
    if(!comentario) {
        res.status(404).send('Acción no válida');
        return next();
    }

    // Consultar el meeti al que pertence el comentario
    const meeti = await meeti.findOne({ where: { id: comentario.meetiId }}); 
    
    // Verificar que quien lo borra es el creador
    if(comentario.usuarioId === req.user.id || meeti.usuarioId === req.user.id ) {
        await Comentarios.destroy({ where: {
            id : comentario.id
        }});
        res.status(200).send('Comentario Eliminado Correctamente');
        return next();
    } else {
        res.status(403).send('Acción no válida');
        return next();
    }
}