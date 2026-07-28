import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getNewsBySlug } from "@/lib/news/service"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import {
  Clock,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Share2,
  Newspaper,
  BookmarkCheck,
} from "lucide-react"
import { generateSeoMetadata } from "@/lib/seo-schemas"

interface ArticlePageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const { article } = await getNewsBySlug(slug)

  if (!article) {
    return generateSeoMetadata({
      title: "Article Not Found | AdmitWise News",
      description: "The requested admission news article could not be found.",
    })
  }

  return generateSeoMetadata({
    title: `${article.title} | AdmitWise News`,
    description: article.summary,
    canonicalUrl: `https://admitwiseedu.com/news/${article.slug}`,
    keywords: [article.category, article.source, "MHT CET News", "CAP Round News"],
  })
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const { article, related } = await getNewsBySlug(slug)

  if (!article) {
    notFound()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 pb-16">
        {/* Back Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200/80 py-3">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 flex items-center justify-between">
            <Link
              href="/news"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to All News
            </Link>
            <span className="text-xs font-semibold text-slate-400">
              {article.category} Update
            </span>
          </div>
        </div>

        <article className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 sm:pt-12">
          {/* Header Metadata */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-white uppercase tracking-wider">
              {article.category}
            </span>
            <span className="rounded-full bg-blue-100 text-blue-800 px-3 py-1 text-xs font-bold border border-blue-200">
              {article.source}
            </span>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight tracking-tight">
            {article.title}
          </h1>

          <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500 pb-6 border-b border-slate-200">
            <span>Published on {new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {article.readTime}
            </span>
          </div>

          {/* Large Thumbnail */}
          {article.imageUrl && (
            <div className="mt-8 rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100 max-h-[420px] w-full">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* AI Summary Box */}
          <div className="mt-10 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs uppercase tracking-wider mb-3">
              <Sparkles className="h-4 w-4 text-blue-600" /> AI Key Highlights &amp; Summary
            </div>
            <p className="text-slate-800 text-sm leading-relaxed font-medium">
              {article.summary}
            </p>
          </div>

          {/* Article Body Content */}
          <div className="mt-8 text-slate-700 text-base leading-relaxed space-y-4 font-normal">
            <p>{article.content || article.summary}</p>
            <p>
              For complete official notices, seat distribution breakdowns, cutoff numbers, and detailed counselling guidelines, please visit the original publication at {article.source}.
            </p>
          </div>

          {/* Prominent External Redirect Button */}
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Official Article Link</p>
              <h3 className="text-base font-bold text-white mt-0.5">Read complete report on {article.source}</h3>
            </div>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg transition duration-300 group shrink-0"
            >
              <span>Read Full Article at {article.source}</span>
              <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* Mandatory Copyright Disclaimer */}
          <div className="mt-10 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-5 text-amber-900 flex items-start gap-3.5 text-xs leading-relaxed">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950 uppercase tracking-wider mb-1">Disclaimer</p>
              <p>
                This page contains an AI-generated summary for informational purposes. The complete article and copyright belong to the original publisher ({article.source}). Please visit the original source for the full content.
              </p>
            </div>
          </div>

          {/* Related Articles Section */}
          {related.length > 0 && (
            <div className="mt-16 pt-12 border-t border-slate-200">
              <h3 className="font-heading text-xl font-extrabold text-slate-900 mb-6">
                Related {article.category} Admission News
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {related.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/news/${rel.slug}`}
                    className="glass-card rounded-2xl border border-slate-200/80 bg-white p-5 hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase mb-2">
                        <span className="text-blue-600">{rel.source}</span>
                        <span>•</span>
                        <span>{rel.readTime}</span>
                      </div>
                      <h4 className="font-heading text-sm font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                        {rel.title}
                      </h4>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-bold text-blue-600">
                      <span>Read More</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  )
}
