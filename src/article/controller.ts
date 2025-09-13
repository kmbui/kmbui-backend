import { Elysia, t } from 'elysia'
import { articles } from './models'
import { eq } from 'drizzle-orm'

export const articleController = (db: any) => (app: Elysia) =>
    app
        .get('/article', async () => {
            const result = await db.select().from(articles)
            return result
        })
        .get('/article/:id', async ({ params }) => {
            const result = await db
            .select()
            .from(articles)
            .where(eq(articles.id, Number(params.id)))
            return result[0] ?? { error: "Not found" }
        })
        .post('/make-article', async ({ body }) => {
            const result = await db.insert(articles).values({
                title: body.title,
                subtitle: body.subtitle,
                theme: body.theme,
                writer: body.writer,
                content: body.content

            }).returning()

            return result[0]
        },
        {
            body: t.Object({
                title: t.String(),
                subtitle: t.String(),
                theme: t.String(),
                writer: t.String(),
                content: t.String()
            })
        }
        
    )