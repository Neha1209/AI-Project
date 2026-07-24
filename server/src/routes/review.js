import { Router } from "express";

const router = Router();

router.post('/', (req, res) => {
    const {prUrl} = req.body;

    if(!prUrl) {
        return res.status(400).json({ error: 'PR URL is required' })
    }

    res.json({
        riskScore: 'low (stub)', summary: '...', 
        toolCalls: []
    })
})

export default router;