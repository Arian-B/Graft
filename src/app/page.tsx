export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-orange-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-32 sm:pb-32">
          <div className="text-center space-y-8">
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white">
              Build Plugins Together.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Publish With Confidence.
              </span>
            </h1>

            {/* Subtext */}
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-300 leading-relaxed">
              Collaborate on plugin development in real-time, directly in your browser. 
              Build, test, and deploy plugins for multiple platforms with powerful tools 
              and seamless workflows that bring your ideas to life faster.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {/* Primary CTA */}
              <button className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:scale-105">
                Get Started
              </button>

              {/* Secondary CTA */}
              <button className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-8 py-4 rounded-lg border border-zinc-700 hover:border-orange-500/50 transition-all duration-300">
                View Supported Platforms
              </button>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      </section>
    </div>
  );
}
