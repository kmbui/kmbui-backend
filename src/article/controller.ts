import { Elysia, t } from 'elysia'
import { articles } from './models'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

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
        })
        .delete('delete-article/:id', async ({ params }) => {
            const { id } = params

            const deleted = await db
                                    .delete(articles)
                                    .where(eq(articles.id, Number(id)))
                                    .returning()
            if (deleted.length == 0) {
                return { error: "Article not Found"}
            }

            return { message: "Article Deleted!", deleted }
        })
        .patch('/update-article/:id', async ({ params, body }) => {
            const { id } = params

            const updates: any= {}
            if (body.title) updates.title = body.title
            if (body.subtitle) updates.subtitle = body.subtitle
            if (body.theme) updates.theme = body.theme
            if (body.writer) updates.writer = body.writer
            if (body.content) updates.content = body.content

            updates.updated_at = sql`(strftime('%s','now'))`

            const updated = await db
                                    .update(articles)
                                    .set(updates)
                                    .where(eq(articles.id, Number(id)))
                                    .returning()
            
            if (updated.length === 0) {
                return { error: "Article not found" }
            }

            return { message: "Article updated!", updated }
        },
        {
            body: t.Partial(
                t.Object({
                title: t.String(),
                subtitle: t.String(),
                theme: t.String(),
                writer: t.String(),
                content: t.String()
            }))
        })