const prisma = require("../utils/prismaClient");

module.exports.getContent = async(req,res) => {
    const {id} = req.query;
    try {
        const formattedId = Number(id)
        const content = await prisma.content.findUnique({
            where: {id: formattedId},
            include: {videos: true}
        })

        if(!content){
            return res.status(204).json({message: 'No Content!'})
        }


        return res.status(200).json({message: 'Content found!', content})
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.getContentByGenre = async(req,res) => {
    const {filter} = req.query
    console.log('The filter', filter)
    try {
        const contents = await prisma.content.findMany({
            where: {genre: filter}
        })

        if(!contents || contents.length === 0){
            return res.status(204).json({message: 'No content!'})
        }

        return res.status(200).json(contents)
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.createComment = async(req,res) => {
    const {text, userId, contentId, parentId} = req.body;

    try{
        const comment = await prisma.comment.create({
  data: {
    text,
    userId,
    contentId,
    ...(parentId && {
      parentId: Number(parentId),
    }),
  },
    include: {
    user: true // 🔥 IMPORTANT
  }
});
          

         
       return res.status(200).json(comment)
    }catch(error){
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.getComments = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Please provide the content id!' });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: {
        contentId: Number(id),
        parentId: null
      },
      include: {
        user: true,
        replies: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json(comments);

  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
};

module.exports.searchContent = async(req,res) => {
    const {query} = req.query;
    try {
        const contentTitles = await prisma.content.findMany({
            where: {
             OR: [
                {
                    title: {
                        startsWith: query,
                        mode: "insensitive",
                    }
                },
                {
                    title: {
                        contains: query,
                        mode: "insensitive",
                    }
                }
             ]    
            },
            select: {title: true, id: true, thumbnail: true},
            take: 10
        })

        return res.status(200).json(contentTitles)
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: error})
    }
}

module.exports.getContentHome = async (req, res) => {
  const { filter } = req.query;

  try {
    let where = {};

    if (filter === "movie") {
      where = {
        type: "Movie",
        genre: {
          in: ["Action", "Drama", "Comedy"],
        },
      };
    } else if (filter === "tv") {
      where = {
        type: "Tv-Series",
        genre: {
          in: ["Action", "Drama", "Comedy"],
        },
      };
    } else {
      where = {
        type: {
          in: ["Tv-Series", "Movie", "Documentary"],
        },
      };
    }

    const results = await prisma.content.findMany({
      where,
    });

    return res.status(200).json(results);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
};


