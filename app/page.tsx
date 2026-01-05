import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-50 border-b border-ink/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="StudyEZ"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-semibold text-ink text-lg">StudyEZ</span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="StudyEZ Logo"
              width={280}
              height={280}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ink mb-6">
            Study Smarter with{" "}
            <span className="text-accent">AI-Powered</span> Learning
          </h1>
          <p className="text-xl text-ink/70 max-w-2xl mx-auto mb-10">
            Upload your study materials and let our AI help you understand, summarize, 
            and answer questions from your documents instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-accent text-white font-semibold text-lg rounded-xl hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/25"
            >
              Start Learning Now →
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-surface text-ink font-semibold text-lg rounded-xl hover:bg-surface/80 transition-all border border-ink/10"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-ink text-center mb-4">
            Everything You Need to Excel
          </h2>
          <p className="text-ink/60 text-center mb-12 max-w-2xl mx-auto">
            Powerful AI features designed to transform how you study and retain information.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-2xl p-8 shadow-sm border border-ink/5">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Easy Upload</h3>
              <p className="text-ink/60">
                Simply drag and drop your PDF or text files. Our system handles the rest, 
                processing and indexing your content automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-2xl p-8 shadow-sm border border-ink/5">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Smart Q&A</h3>
              <p className="text-ink/60">
                Ask any question about your materials and get accurate, context-aware 
                answers powered by advanced RAG technology.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-2xl p-8 shadow-sm border border-ink/5">
              <div className="w-14 h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Source References</h3>
              <p className="text-ink/60">
                Every answer comes with referenced sources from your documents, 
                so you can verify and explore further.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-ink text-center mb-4">
            How It Works
          </h2>
          <p className="text-ink/60 text-center mb-12 max-w-2xl mx-auto">
            Get started in three simple steps
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Upload Materials</h3>
              <p className="text-ink/60">
                Upload your study documents, notes, or textbooks in PDF or text format.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">AI Processing</h3>
              <p className="text-ink/60">
                Our AI analyzes and indexes your content using advanced vector embeddings.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Ask Questions</h3>
              <p className="text-ink/60">
                Ask any question and get instant, accurate answers from your materials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-accent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Study Experience?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already studying smarter with StudyEZ.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 bg-white text-accent font-semibold text-lg rounded-xl hover:bg-white/90 transition-all hover:scale-105 shadow-lg"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-ink">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="StudyEZ"
                width={32}
                height={32}
                className="object-contain brightness-0 invert"
              />
              <span className="font-semibold text-white">StudyEZ</span>
            </div>
            <p className="text-white/60 text-sm">
              Powered by LlamaIndex + PGVector + Gemini 2.5 Flash
            </p>
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} StudyEZ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
