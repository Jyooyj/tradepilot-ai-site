@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: #08100d;
}

* {
  box-sizing: border-box;
}

@media print {
  aside, header, button, input[type="file"] {
    display: none !important;
  }
  main {
    margin: 0 !important;
    max-width: none !important;
  }
  body {
    background: white !important;
    color: black !important;
  }
  pre {
    color: black !important;
    border: 1px solid #ccc !important;
  }
}
