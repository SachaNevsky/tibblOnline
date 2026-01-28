import{w as a,q as i,p as s,M as c,L as l,S as p,t as d,O as u,i as h}from"./chunk-EPOLDU6W-Wp3N_t67.js";const x=()=>[{rel:"preconnect",href:"https://fonts.googleapis.com"},{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"},{rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"}];function f({children:e}){return s.jsxs("html",{lang:"en",children:[s.jsxs("head",{children:[s.jsx("meta",{charSet:"utf-8"}),s.jsx("meta",{name:"viewport",content:"width=device-width, initial-scale=1"}),s.jsx(c,{}),s.jsx(l,{}),s.jsx("script",{dangerouslySetInnerHTML:{__html:`
              (function(l) {
                if (l.search[1] === '/' ) {
                  var decoded = l.search.slice(1).split('&').map(function(s) { 
                    return s.replace(/~and~/g, '&')
                  }).join('?');
                  window.history.replaceState(null, null,
                      l.pathname.slice(0, -1) + decoded + l.hash
                  );
                }
              }(window.location))
            `}})]}),s.jsxs("body",{children:[e,s.jsx(p,{}),s.jsx(d,{})]})]})}const j=a(function(){return s.jsx(u,{})}),g=i(function({error:t}){let o="Oops!",n="An unexpected error occurred.",r;return h(t)&&(o=t.status===404?"404":"Error",n=t.status===404?"The requested page could not be found.":t.statusText||n),s.jsxs("main",{className:"pt-16 p-4 container mx-auto",children:[s.jsx("h1",{children:o}),s.jsx("p",{children:n}),r]})});export{g as ErrorBoundary,f as Layout,j as default,x as links};
