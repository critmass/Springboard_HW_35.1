const express = require("express");
const ExpressError = require("../expressError")
const db = require("../db");
const slugify = require("slugify")


let router = new express.Router();

// listing all industries, which should show the company code(s) 
// for that industry
router.get("/", async (req, res, next) =>{
    try{

        let industry_data = await db.query(
            `select industry, code, comp_code
            from industries 
            left join company_industry 
            on code = ind_code`
        )

        let industries = industry_data.rows.reduce((collection, entry)=>{

            const ind = entry.industry

            if( !collection[ ind ] ){
                collection[ ind ] = { code:entry.code }
            }

            if( !collection[ ind ]["companies"] ){
                collection[ ind ]["companies"] = []
            }
        
            if( entry.comp_code ){
                collection[ ind ]["companies"].push( entry.comp_code )
            }

            return collection
        },{})
    
        return res.json( { industries } )
    } 
    catch (err){
        next(err)
    }
})

// adding an industry
router.post("/", async (req, res, next) =>{
    try{
        let { industry, code } = req.body

        code = code ? code:slugify( name, {
            replacement:'',
            strict:true,
            locale:'en',
            lower:true
        })

        const entry = await db.query(
            `insert into industries ( code, industry )
            values ( $1, $2 )
            returning industry, code`, [code, industry]
        )

        return res.json( {entry:entry.rows[0]} )
    }
    catch (err){
        next(err)
    }
})

// associating an industry to a company
router.put("/:industry_code", async (req, res, next) =>{
    try{

        const { company_code } = req.body
        const industry_code = req.params.industry_code

        if( company_code ){

            const company_industry = await db.query(
                `insert into company_industry ( comp_code, ind_code )
                values ( $1, $2 )
                returning comp_code, ind_code`, 
                [company_code, industry_code]
                )

            if( !company_industry ){
                throw new ExpressError("company or industry not found", 404)
            }

            return res.json( {company_industry : company_industry.rows[0]} )
        }
        else{
            throw new ExpressError("There is no company_code passed", 400)
        }

    }
    catch (err){
        next(err)
    }
})

module.exports = router;