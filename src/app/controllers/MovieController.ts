import { inject, injectable } from "inversify";
import { Controller, Get, interfaces } from "inversify-restify-utils";
import * as HttpStatus from "http-status-codes";
import { DatabaseProvider } from "../../db/DatabaseProvider";
import { LoggingProvider } from "../../logging/LoggingProvider";
import { Movie } from "../models/Movie";
import { ValidationUtilities } from "../../utilities/validationUtilities";

/**
 * controller implementation for our movies endpoint
 */
@Controller("/api/movies")
@injectable()
export class MovieController implements interfaces.Controller {

    constructor(@inject("DatabaseProvider") private cosmosDb: DatabaseProvider, @inject("LoggingProvider") private logger: LoggingProvider) {
        
    }

    /**
     * @swagger
     *
     * /api/movies:
     *   get:
     *     description: Retrieve and return all movies!
     *     tags:
     *       - Movies
     *     parameters:
     *       - name: q
     *         description: The term used to search by movie title (rings)
     *         in: query
     *         schema:
     *           type: string
     *       - name: genre
     *         description: Movies of a genre (Action)
     *         in: query
     *         schema:
     *           type: string
     *       - name: year
     *         description: Get movies by year (2005)
     *         in: query
     *         schema:
     *           type: string
     *       - name: rating
     *         description: Get movies with a rating >= rating (8.5)
     *         in: query
     *         schema:
     *           type: string
     *       - name: actorid
     *         description: Get movies by Actor Id (nm0000704)
     *         in: query
     *         schema:
     *           type: string
     *       - name: pageNumber
     *         description: 1 based page index
     *         in: query
     *         schema:
     *           type: integer
     *           default: 1
     *       - name: pageSize
     *         description: page size (1000 max)
     *         in: query
     *         schema:
     *           type: integer
     *           default: 100
     *     responses:
     *       '200':
     *         description: JSON of movie objects
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Movie'
     *       default:
     *         description: Unexpected error
     */
    @Get("/")
    public async getAllMovies(req, res) {
        // Validate query parameters
        const { validated: validated, message: message } = ValidationUtilities.validateMovies(req.query);
        
        if (!validated) {
            res.setHeader("Content-Type", "text/plain");
            this.logger.trace("InvalidParameter|" + "getAllMovies" + "|" + message);
            return res.send(HttpStatus.BAD_REQUEST, message);
        }

        let resCode: number = HttpStatus.OK;
        let results: Movie[];

        // Execute query
        try {
            results = await this.cosmosDb.queryMovies(req.query);
        } catch (err) {
            resCode = HttpStatus.INTERNAL_SERVER_ERROR;
        }

        return res.send(resCode, results);
    }

    /**
     * @swagger
     *
     * /api/movies/{id}:
     *   get:
     *     description: Retrieve and return a single movie by movie ID.
     *     tags:
     *       - Movies
     *     parameters:
     *       - name: id
     *         description: The ID of the movie to look for.
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       '200':
     *         description: The movie object
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Movie'
     *       '404':
     *         description: A movie with the specified ID was not found.
     *       default:
     *         description: Unexpected error
     */
    @Get("/:id")
    public async getMovieById(req, res) {
        // Validate Movie Id parameter
        const movieId: string = req.params.id;
        const { validated: validated, message: message } = ValidationUtilities.validateMovieId(movieId);

        if (!validated) {
            res.setHeader("Content-Type", "text/plain");
            this.logger.trace("getMovieById|" + movieId + "|" + message);
            return res.send(HttpStatus.BAD_REQUEST, message);
        }

        let resCode: number = HttpStatus.OK;
        let result: Movie;
        try {
            result = new Movie(await this.cosmosDb.getDocument(movieId));
        } catch (err) {
            result = err.toString();

            if (err.toString().includes("404")) {
                resCode = HttpStatus.NOT_FOUND;
            } else {
                resCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }
        }

        return res.send(resCode, result);
    }
}
