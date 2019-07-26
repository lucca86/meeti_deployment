const Meeti = require('../../models/Meeti');
const Grupos = require('../../models/Grupos');
const Usuarios = require('../../models/Usuarios');
const Comentarios = require('../../models/Comentarios');
const Categorias = require('../../models/Categorias');
const moment = require('moment');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;


exports.mostrarMeeti = async (req, res) => {
    const meeti = await Meeti.findOne({
        where: {
            slug: req.params.slug
        },
        include: [
            {
                model: Grupos,
            },
            {
                model: Usuarios,
                attributes: ['id', 'nombre', 'imagen']
            }
        ]
    });

    // Si no existe
    if(!meeti) {
        res.redirect('/');
    }

    // Consultar por meeti's cercanos
    const ubicacion = Sequelize.literal(`ST_GeomFromText( 'POINT( ${meeti.ubicacion.coordinates[0]} ${meeti.ubicacion.coordinates[1] })')`);

    // ST_DISTANCE_Sphere = retorna una línea en metros
    const distancia = Sequelize.fn('ST_Distance_sphere', Sequelize.col('ubicacion'), ubicacion);
    
    // Encontrar meeti's cercanos
    const cercanos = await Meeti.findAll({
        order: distancia, // Los ordena del más cercano al más lejano
        where: Sequelize.where( distancia, { [Op.lte] : 2000 }),  // 2000 metros 
        limit: 3, // máximo 3
        offset: 1, // Ignora el primer meeti (en este caso el mismo)
        include: [
            {
                model: Grupos,
            },
            {
                model: Usuarios,
                attributes: ['id', 'nombre', 'imagen']
            }
        ]
    })

    // Consultar después de verificar si existe Meeti
    const comentarios = await Comentarios.findAll({
        where: {
            meetiId: meeti.id
        },
        include: [
            {
                model: Usuarios,
                attributes: ['id', 'nombre', 'imagen']
            }
        ]
    });

    // Pasar el resultado hacia la vista
    res.render('mostrar-meeti', {
        nombrePagina: meeti.titulo,
        meeti,
        comentarios,
        cercanos,
        moment
    })
}

// Confirma o cancela siel usuario asistirá al Meeti
exports.confirmarAsistencia = async (req, res) => {

    console.log(req.body);

    const { accion } = req.body;

    if (accion === 'confirmar') {
        // Agregar el usuario
        Meeti.update(
            {
                'interesados' : Sequelize.fn('array_append', Sequelize.col('interesados'), req.user.id)
            },
            {
                where: {'slug' : req.params.slug }
            }
        );

        // Mensaje
        res.send('Has Confirmado tu Asistencia');
        
    } else {
        // Cancelar la asistencia del usuario
        Meeti.update(
            {
                'interesados' : Sequelize.fn('array_remove', Sequelize.col('interesados'), req.user.id)
            },
            {
                where: {'slug' : req.params.slug }
            }
        );

        // Mensaje
        res.send('Has Cancelado tu Asistencia');
    }
}

// Muestra el listado de asistentes
exports.mostrarAsistentes = async (req, res) => {
    const meeti = await Meeti.findOne({
            where: {
                slug: req.params.slug
            },
            attributes: ['interesados']
        });

    // Extraer los interesados
    const { interesados } = meeti;

    const asistentes = await Usuarios.findAll({
            where: {
                id: interesados
            },
            attributes: ['nombre', 'imagen']
    });

    // Crear la vista y pasar los datos

        res.render('asistentes-meeti', {
            nombrePagina: 'Listado de Asistentes',
            asistentes
        });
}

// Mostrar Meetis agrupados por categia
exports.mostrarCategoria = async (req, res, next) => {
    const categoria = await Categorias.findOne({
        attributes: ['id', 'nombre'],
        where: {
            slug: req.params.categoria
        }
    });

    const meetis = Meeti.findAll({
        order: [
            ['fecha', 'ASC'],
            ['hora', 'ASC']
        ],
        include: [
            {
                model: Grupos,
                where: {
                    categoriaId: categoria.id
                },
                model: Usuarios
            }
        ]
    });

    // Pasamos a la vista
    res.render('categoria', {
        nombrePagina: `Categoria: ${categoria.nombre}`,
        meetis,
        moment
    })
 }