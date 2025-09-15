import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, Star } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: "Sarah Chen",
    role: "Lead Blockchain Developer",
    company: "TechCorp",
    content:
      "Arguschain streamlined our debugging, reduced gas costs, and let us move faster than ever. It’s not just tooling—it’s acceleration.",
    rating: 5,
  },
  {
    name: "Michael Rodriguez",
    role: "Security Researcher",
    company: "CryptoSec Labs",
    content:
      "In enterprise audits, every detail matters. Arguschain surfaces vulnerabilities and inefficiencies with unmatched clarity.",
    rating: 5,
  },
  {
    name: "Emily Johnson",
    role: "DeFi Protocol Architect",
    company: "DeFi Innovations",
    content:
      "Real‑time analytics gave us visibility we never had before. It’s rare that a tool feels this integral to the workflow.",
    rating: 5,
  },
];

const stats = [
  { label: "Enterprise Clients", value: "500+" },
  { label: "Transactions Analyzed", value: "10M+" },
  { label: "Avg Response Time", value: "<50ms" },
  { label: "Customer Satisfaction", value: "99.8%" },
];

export function SocialProofSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative bg-[#0d1117] py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-20">
        {/* LEFT — Rotating headline testimonial */}
        <div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#00bfff] mb-10">
            Trusted by industry leaders
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6 }}
              className="relative bg-[rgba(25,28,40,0.85)] border border-[#00bfff]/20 rounded-xl shadow-lg p-10"
            >
              <Quote className="absolute -top-6 left-8 h-10 w-10 text-[#00bfff]/40" />
              <div className="mb-4 flex">
                {[...Array(testimonials[index].rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-5 w-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-xl leading-relaxed text-slate-200 italic mb-8">
                “{testimonials[index].content}”
              </p>
              <div className="pt-4 border-t border-[#00bfff]/15">
                <p className="font-semibold text-[#00bfff]">
                  {testimonials[index].name}
                </p>
                <p className="text-sm text-slate-400">
                  {testimonials[index].role} — {testimonials[index].company}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT — Stats + supporting testimonials */}
        <div className="space-y-12">
          {/* Stats */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { staggerChildren: 0.15 },
              },
            }}
            className="grid grid-cols-2 gap-6"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="p-6 rounded-lg bg-[rgba(20,25,35,0.8)] border border-[#00bfff]/15 text-center"
              >
                <div className="text-3xl font-bold text-[#00bfff] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Mini supporting testimonials (static quotes) */}
          <div className="space-y-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="border-l-2 border-[#00bfff]/40 pl-4"
              >
                <p className="text-slate-300 text-sm italic mb-1">
                  “{t.content.slice(0, 100)}...”
                </p>
                <p className="text-xs text-slate-500">
                  — {t.name}, {t.company}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
