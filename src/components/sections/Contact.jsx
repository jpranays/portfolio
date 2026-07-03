import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Panel } from "../ui/Panel";
import { ListRow } from "../ui/ListRow";
import { useToast } from "../effects/Toast";
import { useMotionPreference } from "../../hooks/useMotionPreference";
import { useAvailability } from "../../hooks/useAvailability";
import { cn } from "../../utils/cn";

const EMAIL = "pranay1315@gmail.com";
const CAL_URL = "https://cal.com/jpranays";

/* The four professional channels — the long tail lives in the footer. */
const CHANNELS = [
  { label: "GitHub", handle: "github.com/jpranays", href: "https://github.com/jpranays" },
  { label: "LinkedIn", handle: "in/jpranays", href: "https://www.linkedin.com/in/jpranays" },
  { label: "npm", handle: "~jpranays", href: "https://www.npmjs.com/~jpranays" },
  { label: "X", handle: "@jpranays", href: "https://x.com/jpranays" },
];

/* ── form plumbing ──────────────────────────────────────────────────── */

const FIELD_META = [
  { id: "name", label: "Name", type: "text", autoComplete: "name", placeholder: "Your name" },
  { id: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
  { id: "message", label: "Message", textarea: true, placeholder: "What are you building?" },
];

/* Inputs at 16px (text-base — kills iOS auto-zoom), surface-2 fills,
   8px radius. Focus ring comes from the global :focus-visible rule. */
const INPUT_CLASS =
  "w-full rounded-panel border border-hairline bg-surface-2 px-3.5 py-2.5 " +
  "text-base leading-normal text-primary placeholder:text-tertiary " +
  "transition-colors duration-base focus:border-strong";

async function postToNetlify(values) {
  const params = new URLSearchParams({
    "form-name": "contact",
    "bot-field": "",
    name: values.name,
    email: values.email,
    message: values.message,
  });
  const res = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Netlify form post failed: ${res.status}`);
}

function NetlifyHiddenFields() {
  return (
    <>
      <input type="hidden" name="form-name" value="contact" />
      <p hidden aria-hidden="true">
        <label>
          Don&apos;t fill this out:{" "}
          <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
    </>
  );
}

function Field({ meta, error, inputProps }) {
  const { id, label, textarea, type, autoComplete, placeholder } = meta;
  const errorId = `${id}-error`;
  const shared = {
    id,
    placeholder,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: cn(INPUT_CLASS, textarea && "resize-none", error && "border-danger"),
    ...inputProps,
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-secondary">
        {label}
      </label>
      {textarea ? <textarea rows={5} {...shared} /> : <input type={type} {...shared} />}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitRow({ status }) {
  const sending = status === "sending";
  return (
    <div>
      <button
        type="submit"
        disabled={sending}
        data-ping
        className={cn(
          "inline-flex h-11 w-full items-center justify-center rounded-panel bg-accent px-5",
          "text-base font-medium text-accent-on",
          "transition duration-base hover:brightness-110 active:scale-[0.98]",
          sending && "cursor-not-allowed opacity-70"
        )}
      >
        {sending ? "Sending…" : "Send message"}
      </button>
      {status === "error" && (
        <p role="alert" className="mt-3 text-[13px] leading-relaxed text-danger">
          Something went wrong — email me directly at{" "}
          <a href={`mailto:${EMAIL}`} className="underline underline-offset-2">
            {EMAIL}
          </a>
          .
        </p>
      )}
    </div>
  );
}

/**
 * Pre-hydration form: plain uncontrolled fields with native validation.
 * First focus on any field kicks off the react-hook-form + zod dynamic
 * import; values typed meanwhile are mirrored into valuesRef so the
 * validated form can take over without losing anything.
 */
function BasicForm({ valuesRef, focusIdRef, onFirstFocus, status, onSubmitValues }) {
  const handleFocus = (e) => {
    focusIdRef.current = e.target.id;
    onFirstFocus();
  };
  const handleChange = (e) => {
    valuesRef.current[e.target.name] = e.target.value;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const ok = await onSubmitValues({ ...valuesRef.current });
    if (ok) {
      form.reset();
      valuesRef.current = { name: "", email: "", message: "" };
    }
  };
  const limits = {
    name: { minLength: 2, maxLength: 50 },
    email: {},
    message: { minLength: 10, maxLength: 500 },
  };

  return (
    <form
      name="contact"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      aria-label="Contact form"
    >
      <NetlifyHiddenFields />
      <div className="space-y-5">
        {FIELD_META.map((meta) => (
          <Field
            key={meta.id}
            meta={meta}
            inputProps={{
              name: meta.id,
              required: true,
              defaultValue: valuesRef.current[meta.id],
              onFocus: handleFocus,
              onChange: handleChange,
              ...limits[meta.id],
            }}
          />
        ))}
        <SubmitRow status={status} />
      </div>
    </form>
  );
}

/** react-hook-form + zod form — mounts once the lazy import resolves. */
function ValidatedForm({ libs, defaults, initialFocusId, status, onSubmitValues }) {
  const { useForm, z, zodResolver } = libs;

  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(2, "Name needs at least 2 characters")
          .max(50, "Name must be under 50 characters"),
        email: z.string().email("Enter a valid email address"),
        message: z
          .string()
          .min(10, "Message needs at least 10 characters")
          .max(500, "Message must be under 500 characters"),
      }),
    [z]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaults });

  /* Restore focus + caret to the field the visitor was typing in when the
     basic form was swapped out. Runs once on mount. */
  useEffect(() => {
    if (!initialFocusId) return;
    const el = document.getElementById(initialFocusId);
    if (!el || document.activeElement === el) return;
    el.focus({ preventScroll: true });
    if (typeof el.setSelectionRange === "function") {
      try {
        const end = el.value.length;
        el.setSelectionRange(end, end);
      } catch {
        /* input types like email don't support selection ranges */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    const ok = await onSubmitValues(data);
    if (ok) reset({ name: "", email: "", message: "" });
  });

  return (
    <form
      name="contact"
      method="POST"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      noValidate
      onSubmit={onSubmit}
      aria-label="Contact form"
    >
      <NetlifyHiddenFields />
      <div className="space-y-5">
        {FIELD_META.map((meta) => (
          <Field
            key={meta.id}
            meta={meta}
            error={errors[meta.id]?.message}
            inputProps={register(meta.id)}
          />
        ))}
        <SubmitRow status={status} />
      </div>
    </form>
  );
}

/**
 * The form panel — the SECONDARY contact path. react-hook-form + zod are
 * lazy-loaded on first field focus (dynamic import); success fires a Toast
 * plus one 600ms accent border flash on the panel. No confetti — that
 * belongs to the Konami unlock alone.
 */
function FormPanel() {
  const toast = useToast();
  const [libs, setLibs] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | sending | error
  const [flash, setFlash] = useState(false);
  const libsPromise = useRef(null);
  const valuesRef = useRef({ name: "", email: "", message: "" });
  const focusIdRef = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const loadLibs = useCallback(() => {
    if (libsPromise.current) return libsPromise.current;
    libsPromise.current = Promise.all([
      import("react-hook-form"),
      import("zod"),
      import("@hookform/resolvers/zod"),
    ])
      .then(([rhf, zod, resolvers]) => {
        const next = {
          useForm: rhf.useForm,
          z: zod.z,
          zodResolver: resolvers.zodResolver,
        };
        setLibs(next);
        return next;
      })
      .catch(() => {
        // Import failed (offline, stale chunk) — the basic form keeps
        // working with native validation; retry on the next focus.
        libsPromise.current = null;
        return null;
      });
    return libsPromise.current;
  }, []);

  const submitValues = useCallback(
    async (values) => {
      setStatus("sending");
      try {
        await postToNetlify(values);
        setStatus("idle");
        toast.success("Message sent — I reply within 24 hours.");
        setFlash(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(false), 600);
        return true;
      } catch {
        setStatus("error");
        return false;
      }
    },
    [toast]
  );

  return (
    <Panel
      size="lg"
      header="message --new"
      className="transition-[border-color] duration-base"
      style={flash ? { borderColor: "var(--ap-vivid)" } : undefined}
    >
      {libs ? (
        <ValidatedForm
          libs={libs}
          defaults={{ ...valuesRef.current }}
          initialFocusId={focusIdRef.current}
          status={status}
          onSubmitValues={submitValues}
        />
      ) : (
        <BasicForm
          valuesRef={valuesRef}
          focusIdRef={focusIdRef}
          onFirstFocus={loadLibs}
          status={status}
          onSubmitValues={submitValues}
        />
      )}
    </Panel>
  );
}

/* ── motion (A6: one-shot 12px rise + fade 320ms, 40ms stagger) ─────── */

const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

function Contact() {
  const reduced = useMotionPreference();
  const toast = useToast();
  const { available } = useAvailability();

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error(`Copy failed — the address is ${EMAIL}`);
    }
  }, [toast]);

  return (
    <section id="contact" aria-label="Contact">
      <div className="mx-auto max-w-[1120px] px-5 sm:px-8">
        <div className="border-t border-hairline py-20 lg:py-28">
          <motion.div
            variants={stagger}
            initial={reduced ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.div variants={rise}>
              <SectionHeader eyebrow="~/contact" title="One email away" />
            </motion.div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              {/* ── Left: the lead block — email first, form second ── */}
              <motion.div variants={rise} className="lg:col-span-6">
                {/* Availability chip — the hero chip's link target; its
                    second and final render. No pulse: the status bar owns
                    the page's only looping animation. */}
                <p className="inline-flex items-center gap-2 rounded-full bg-accent-dim px-3 py-1 font-mono text-[13px] font-medium text-accent-text">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-accent"
                  />
                  {available
                    ? "Open to senior frontend roles"
                    : "Not taking new roles right now"}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${EMAIL}`}
                    data-ping
                    className="inline-flex h-11 items-center justify-center rounded-panel bg-accent px-5 text-base font-medium text-accent-on transition duration-base hover:brightness-110 active:scale-[0.98]"
                  >
                    {EMAIL}
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    aria-label="Copy email address"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-panel border border-strong text-secondary transition-colors duration-base hover:bg-surface-2 hover:text-primary"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <p className="mt-4 text-base text-secondary">
                  I reply within 24 hours.
                </p>

                <a
                  href={CAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-panel border border-strong px-4 text-base font-medium text-primary transition-colors duration-base hover:bg-surface-2"
                >
                  Book a 30-min call
                  <span aria-hidden="true">↗</span>
                </a>

                {/* Four labeled professional channels — long tail in footer */}
                <div className="mt-10">
                  <p className="font-mono text-[13px] font-medium text-tertiary">
                    channels
                  </p>
                  <ul role="list" className="-mx-3 mt-2 space-y-1">
                    {CHANNELS.map((c) => (
                      <li key={c.label}>
                        <ListRow
                          href={c.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${c.label} — ${c.handle}`}
                          title={c.label}
                          meta={
                            <>
                              <span className="font-mono">{c.handle}</span>
                              <span aria-hidden="true">↗</span>
                            </>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              {/* ── Right: the form panel (secondary path) ── */}
              <motion.div variants={rise} className="lg:col-span-6">
                <FormPanel />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default memo(Contact);
