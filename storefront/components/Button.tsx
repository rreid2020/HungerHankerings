import Link from "next/link"
import { ComponentProps } from "react"
import clsx from "clsx"

type ButtonProps = ComponentProps<"button"> & {
  href?: string
  variant?: "primary" | "secondary" | "ghost"
}

const baseStyles =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const variants = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:opacity-90",
  ghost: "border border-border text-foreground hover:bg-muted"
}

const Button = ({
  href,
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) => {
  const classes = clsx(baseStyles, variants[variant], className)

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
