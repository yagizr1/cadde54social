import {
  Link as RRLink,
  NavLink as RRNavLink,
  Navigate as RRNavigate,
  useNavigate as useRRNavigate,
  type LinkProps,
  type NavigateFunction,
  type NavigateProps,
  type NavLinkProps,
  type To,
} from 'react-router-dom'
import { appPath } from './appPath'

function mapTo(to: To): To {
  if (typeof to === 'string') return appPath(to)
  if (to && typeof to === 'object' && 'pathname' in to && typeof to.pathname === 'string') {
    return { ...to, pathname: appPath(to.pathname) }
  }
  return to
}

export function Link({ to, ...rest }: LinkProps) {
  return <RRLink to={mapTo(to)} {...rest} />
}

export function NavLink({ to, ...rest }: NavLinkProps) {
  return <RRNavLink to={mapTo(to)} {...rest} />
}

export function Navigate({ to, ...rest }: NavigateProps) {
  return <RRNavigate to={mapTo(to)} {...rest} />
}

export function useNavigate(): NavigateFunction {
  const nav = useRRNavigate()
  return ((to: To | number, opts?: object) => {
    if (typeof to === 'number') return nav(to)
    return nav(mapTo(to), opts as never)
  }) as NavigateFunction
}
