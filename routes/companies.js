const express = require("express")
const ExpressError = require("../expressError")
const db = require("../db")
const slugify = require("slugify")


let router = new express.Router();

// GET /companies
// Returns list of companies, like {companies: [{code, name}, ...]}
router.get("/", async (req, res, next) =>{
    try {
        let companies = await db.query(
            "select code, name from companies"
        )
        return res.json( {companies : companies.rows} )
    }
    catch (err){
        next(err)
    }
})


// GET /companies/[code]
// when viewing details for a company, 
// you can see the names of the industries for that company
// Return obj of company: 
// {company: {code, name, description, invoices: [id, ...], industries:[industry, ...]}}

// If the company given cannot be found, this should return a 
// 404 status response.
router.get("/:code", async (req, res, next) =>{

    try{

        const companyCode = req.params.code

        let company_data = await db.query(
            `select code, name, description 
            from companies 
            where code = $1`, [companyCode]
        )
        if( company_data.rows[0] ){

            let invoices = await db.query(
                `select id
                from invoices
                where comp_code = $1`, [companyCode]
            )
            let industries = await db.query(
                `select industry
                from industries ind
                inner join company_industry ci
                on ind.code = ci.ind_code
                where ci.comp_code = $1`, [companyCode]
            )
            let company = {
                code:company_data.rows[0].code,
                name:company_data.rows[0].name,
                description:company_data.rows[0].description,
                invoices:invoices.rows.map( invoice => invoice["id"]),
                industries:industries.rows.map( industry => industry["industry"])
            }
            return res.json( {company} )
        }
        else{

            throw new ExpressError( 
                `code:${ companyCode } not found`, 404 ) 
        }
    }
    catch (err){
        next(err)
    }

})

// POST /companies
// Adds a company.

// Needs to be given JSON like: {code, name, description}

// Returns obj of new company: {company: {code, name, description}}
router.post("/", async (req, res, next) =>{
    try{
        
        let { code, name, description } = req.body

        code = code ? code:slugify( name, {
            replacement:'',
            strict:true,
            locale:'en',
            lower:true
        })

        const company = await db.query(
            `insert into companies (code, name, description)
            values ($1, $2, $3)
            returning code, name, description`,
            [code, name, description]
        )

        return res.json( {company:company.rows[0]} )
    }
    catch (err){
        next(err)
    }
})

// PUT /companies/[code]
// Edit existing company.

// Should return 404 if company cannot be found.

// Needs to be given JSON like: {name, description}

// Returns update company object: {company: {code, name, description}}
router.put("/:code", async (req, res, next) =>{
    try{

        const { name, description } = req.body
        const code = req.params.code

        const company = await db.query(
            `UPDATE companies 
            SET name = $2, description = $3 
            WHERE code = $1
            RETURNING code, name, description`, 
            [code, name, description]
        )

        if( !company.rows[0] ){
            throw new ExpressError(`code: ${ code } not found`, 404)
        }

        return res.json( {company:company.rows[0]} )
    }
    catch (err){
        next(err)
    }
})

// DELETE /companies/[code]
// Deletes company.

// Should return 404 if company cannot be found.

// Returns {status: "deleted"}
router.delete("/:code", async (req, res, next) =>{
    try{

        const companyCode = req.params.code
        const confirmation = await db.query(
            `delete from companies where code = $1`, [companyCode]
        )
    
        if( !confirmation.rowCount ){
            throw new ExpressError(
                `code: ${ companyCode } not found`, 404)
        }

        return res.json( {status:"deleted"} )
    }
    catch (err){
        next(err)
    }
})



module.exports = router;