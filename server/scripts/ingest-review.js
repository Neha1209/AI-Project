import 'dotenv/config'
import { reviewPR } from '../src/lib/agent.js'

const result = await reviewPR('https://github.com/expressjs/express/pull/4891')
console.log(result)

