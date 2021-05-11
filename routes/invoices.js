const express = require("express");
const ExpressError = require("../expressError")
const db = require("../db");


let router = new express.Router();

// GET /invoices
// Return info on invoices: like {invoices: [{id, comp_code}, ...]}
router.get("/", async (req, res, next) =>{
    try{

        let invoices = await db.query(
            "select id, comp_code from invoices"
        )

        return res.json( { invoices:invoices.rows } )
    }
    catch (err){
        next(err)
    }
})

// GET /invoices/[id]
// Returns obj on given invoice.

// If invoice cannot be found, returns 404.

// Returns {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}
router.get("/:id", async (req, res, next) =>{
    try{

        const id = req.params.id

        let invoice_data = await db.query(
            `select invoices.id, invoices.amt, invoices.paid, 
            invoices.add_date, invoices.paid_date, invoices.comp_code,
            companies.name, companies.description 
            from invoices
            inner join companies on companies.code = invoices.comp_code
            where id = $1`, [id]
        )

        if( !invoice_data.rows[0] ){
            throw new ExpressError(`invoice id: ${ id } not found`, 404)
        }

        const invoice = {
            id:invoice_data.rows[0].id,
            amt:invoice_data.rows[0].amt,
            paid:invoice_data.rows[0].paid,
            add_date:invoice_data.rows[0].add_date,
            paid_date:invoice_data.rows[0].paid_date,
            company:{
                code:invoice_data.rows[0].comp_code,
                name:invoice_data.rows[0].name,
                description:invoice_data.rows[0].description
            }
        }

        return res.json( { invoice } )
    }
    catch (err){
        next(err)
    }
})

// POST /invoices
// Adds an invoice.

// Needs to be passed in JSON body of: {comp_code, amt}

// Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
router.post("/", async (req, res, next) =>{
    try{
        const { comp_code, amt } = req.body

        const company = await db.query(
            `select code from companies where code = $1`,
            [comp_code]
        )

        if( !company.rows[0] ){
            throw new ExpressError(
                `comp_code: ${ comp_code } not found`, 404)
        }

        let invoice = await db.query(
            `insert into invoices (comp_code, amt)
            values ($1, $2)
            returning id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]
        )

        return res.json( { invoice:invoice.rows[0] } )
    }
    catch (err){
        next(err)
    }
})

// PUT /invoices/[id]
// Updates an invoice.

// If invoice cannot be found, returns a 404.

// Needs to be passed in a JSON body of {amt}

// Returns: {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
router.post("/:id", async (req, res, next) =>{
    try{

        const id = req.params.id
        const {  amt } = req.body

        let invoice = await db.query(
            `update invoices 
            set amt = $2
            where id = $1
            returning id, comp_code, amt, paid, add_date, paid_date`,
            [id, amt]
        )

        if( !invoice.rows[0] ){
            throw new ExpressError(`invoice id: ${ id } not found`, 404)
        }

        return res.json( { invoice:invoice.rows[0] } )
    }
    catch (err){
        next(err)
    }
})

// DELETE /invoices/[id]
// Deletes an invoice.

// If invoice cannot be found, returns a 404.

// Returns: {status: "deleted"}
router.delete("/:id", async (req, res, next) =>{
    try{
        const id = req.params.id

        let confirmation = await db.query(
            `delete from invoices where id = $1`, [id]
        )

        if( !confirmation.rowCount ){
            throw new ExpressError(
                `invoice id: ${ id } not found`, 404)
        }

        return res.json( {status: "deleted"} )
    }
    catch (err){
        next(err)
    }
})

module.exports = router;