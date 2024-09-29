const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

//URL y selectores
const URL =
  "http://sij.usfx.bo/elibro/principal.usfx?cu=null&ca=INV&idLibro=null";
// const diplomado = "#j_idt16\\:j_idt107\\:0\\:_t110";
const categoriasSelector = '[id^="j_idt16:j_idt107:"][id$=":_t110"]';
const librosSelector = "[id^='j_idt16:j_idt49:'][id$=':_t55']";
const selectorPaginaciones = '[id^="j_idt16:j_idt68:"][id$=":_t70"]';
/**######################################################################*/
let categoriaBuscar = "Diplomado en Docencia para Educación Superior";
/**######################################################################*/

//Funcion para obtener los titulos de las categorias
const obtenerTitulosCategorias = async (page, selectorCategorias) => {
  try {
    //Esperar y extraer todos los titulos de las categorias
    await page.waitForSelector(selectorCategorias, { timeout: 10000 });
    const titulosCategorias = await page.$$eval(
      selectorCategorias,
      (elements) => elements.map((el) => el.textContent.trim().toLowerCase())
    );

    console.group("Todas las categorias");
    console.table(titulosCategorias);
    console.groupEnd("Todas las categorias");

    return titulosCategorias;
  } catch (error) {
    console.log("Error al obtener los titulos de las categorias:", error);
    return [];
  }
};

//Funcion para obtener el total de paginaciones
const obtenerTotalPaginaciones = async (page, selectorPaginacion) => {
  try {
    //Intentar encontrar el selector de paginacion
    const paginacionExistente = await page.$(selectorPaginacion);

    //Si no existe paginacion, retornar false
    if (!paginacionExistente) {
      console.log("No se encontró paginación.");
      return false;
    }

    //Esperar por el selector de paginacion y extraer su texto (número)
    await page.waitForSelector(selectorPaginacion, { timeout: 10000 });
    const paginacion = await page.$$eval(selectorPaginacion, (elements) =>
      elements.map((el) => el.textContent.trim().toLowerCase())
    );
    console.log(paginacion.length);

    //Si se encontraron paginaciones, devolver el numero total
    if (paginacion.length > 0) {
      console.group("Paginación");
      console.table(paginacion);
      console.log("Total paginaciones: ", paginacion.length);
      console.groupEnd("Paginación");
      return paginacion.length;
    } else {
      console.log("No se encontraron paginaciones.");
      return false;
    }
  } catch (error) {
    console.log("Error al obtener paginacion: ", error);
  }
};

//Funcion para limpiar los nombres de archivo
const limpiarNombreArchivo = (nombre) => {
  //Reemplazar caracteres no permitidos en nombres de archivos por guiones bajos
  return nombre
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, "") // Elimina caracteres especiales
    .replace(/\.$/, "") // Elimina punto al final
    .replace(/\s+/g, " ") // Reemplaza múltiples espacios por uno
    .trim(); // Elimina espacios al inicio y al final
};

//Funcion para añadir sufijo numerico si el directorio ya existe
const generarNombreUnico = (directorioDestino) => {
  let contador = 1;
  let nuevoDirectorio = directorioDestino;

  //Mientras el directorio ya exista, añade un sufijo numerico
  while (fs.existsSync(nuevoDirectorio)) {
    nuevoDirectorio = `${directorioDestino}_${contador}`;
    contador++;
  }
  return nuevoDirectorio;
};

//Funcion para crear un nuevo directorio si no existe y asegurarse de no sobreescribir
const crearDirectorioSiNoExiste = (directorio) => {
  if (fs.existsSync(directorio)) {
    directorio = generarNombreUnico(directorio);
  }
  fs.mkdirSync(directorio, { recursive: true });
  return directorio;
};

//Funcion para capturar y guardar la imagen
const capturarImagen = async (page, directorioDestino, pagina) => {
  try {
    const imagenSelector = ".documentPageView img";
    await page.waitForSelector(imagenSelector, { timeout: 10000 });
    const imagen = await page.$(imagenSelector);
    const imagenBuffer = await imagen.screenshot();
    const rutaArchivo = path.join(directorioDestino, `${pagina}.png`);
    fs.writeFileSync(rutaArchivo, imagenBuffer);
    console.log(`Imagen ${pagina} guardada en: ${rutaArchivo}`);
  } catch (error) {
    console.error(`Error al capturar la imagen en página ${pagina}:`, error);
  }
};

//Función principal
const extractor = async () => {
  //Lanzar el navegador
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    //Navegar a la pagina principal
    await page.goto(URL, { waitUntil: "networkidle" });

    //Esperar y extraer todos los titulos de las categorias
    const titulosCategorias = await obtenerTitulosCategorias(
      page,
      categoriasSelector
    );

    if (titulosCategorias.length === 0) {
      console.error("No se encontraron categorias. Finalizando la ejecucion");
      return;
    }

    //Iterar sobre las categorias para hacer click en la categoria buscada
    for (let i = 0; i < titulosCategorias.length; i++) {
      const selectorCategoria = `#j_idt16\\:j_idt107\\:${i}\\:_t110`;

      //Esperar por el selector de la categoria y obtener su texto
      await page.waitForSelector(selectorCategoria, { timeout: 10000 });
      const tituloCategoria = await page.$eval(
        selectorCategoria,
        (element) => element.textContent
      );

      console.log("titulo categoria buscar: ", categoriaBuscar);
      console.log("titulo categoria : ", tituloCategoria);

      if (tituloCategoria === categoriaBuscar) {
        const flag = i;
        //hace click en la categoria indicada
        await page.waitForSelector(`#j_idt16\\:j_idt107\\:${flag}\\:_t108`, {
          timeout: 10000,
        });
        await page.click(`#j_idt16\\:j_idt107\\:${flag}\\:_t108`);

        // Espera opcional para ver el resultado
        await page.waitForTimeout(2000);

        //Obtener el total de paginaciones
        const totalPaginaciones = await obtenerTotalPaginaciones(
          page,
          selectorPaginaciones
        );

        let paginaciones = 1;

        if (!totalPaginaciones === false) {
          paginaciones = totalPaginaciones;
        }

        for (let j = 0; j < paginaciones; j++) {
          //Hacer click en la paginacion
          try {
            await page.waitForSelector(`#j_idt16\\:j_idt68\\:${j}\\:_t70`, {
              timeout: 10000,
            });
            await page.click(`#j_idt16\\:j_idt68\\:${j}\\:_t70`);

            // Espera opcional para ver el resultado
            await page.waitForTimeout(2000);
          } catch (error) {
            console.log("No hay paginacion...", error);
          }

          //Esperar por el selector de libros y extraer su texto
          await page.waitForSelector(librosSelector, { timeout: 10000 });
          const titulosLibros = await page.$$eval(librosSelector, (elements) =>
            elements.map((el) => el.textContent.trim().toLowerCase())
          );
          console.group("Titulos de los libros");
          console.table(titulosLibros);
          console.groupEnd("Titulos de los libros");

          //extraer los libros----------------------
          for (let i = 0; i < titulosLibros.length; i++) {
            //Crear un nuevo navegador para cada iteracion (libro)
            const browser = await chromium.launch({ headless: false });
            const page = await browser.newPage();

            try {
              //Navegar a la pagina principal
              await page.goto(URL, { waitUntil: "networkidle" });

              //volver a entrar a la categoria
              try {
                console.log("Librooooo");
                //hace click en la categoria indicada
                await page.waitForSelector(
                  `#j_idt16\\:j_idt107\\:${flag}\\:_t108`,
                  {
                    timeout: 10000,
                  }
                );
                await page.click(`#j_idt16\\:j_idt107\\:${flag}\\:_t108`);

                // Espera opcional para ver el resultado
                await page.waitForTimeout(2000);
              } catch (error) {
                console.log(error);
              }

              /***** ###### Explorar # paginaciones ###### ****** */
              try {
                //hace click en la paginacion
                await page.waitForSelector(`#j_idt16\\:j_idt68\\:${j}\\:_t70`, {
                  timeout: 10000,
                });
                await page.click(`#j_idt16\\:j_idt68\\:${j}\\:_t70`);

                // Espera opcional para ver el resultado
                await page.waitForTimeout(2000);
              } catch (error) {
                console.log(error);
              }
              /***** ###### ###################### ###### ****** */

              //extraer las imagenes de los libros
              try {
                const selectorLibro = `#j_idt16\\:j_idt49\\:${i}\\:_t55`;

                await page.waitForSelector(selectorLibro, {
                  timeout: 10000,
                });
                await page.click(selectorLibro);

                // Espera opcional para ver el resultado
                await page.waitForTimeout(2000);

                //----------------------------------------
                // Obtener el total de páginas

                await page.waitForSelector("#j_idt130\\:_t142");
                const textoTotalPaginas = await page.textContent(
                  "#j_idt130\\:_t142"
                );
                const match = textoTotalPaginas.match(/\d+/);
                const totalPaginas = match ? parseInt(match[0], 10) : 0;
                console.log(`Total de páginas: ${totalPaginas}`);

                //****** Ruta al escritorio en Windows
                const nombreCarpetaLimpio =
                  limpiarNombreArchivo(categoriaBuscar);
                const escritorio = path.join(
                  process.env.USERPROFILE,
                  "Desktop",
                  nombreCarpetaLimpio
                );
                const tituloLimpio = limpiarNombreArchivo(titulosLibros[i]);

                const directorioDestino = crearDirectorioSiNoExiste(
                  path.join(
                    process.env.USERPROFILE,
                    "Desktop",
                    nombreCarpetaLimpio,
                    tituloLimpio
                  )
                );

                // Iterar sobre el número total de páginas
                for (let i = 1; i <= totalPaginas; i++) {
                  await capturarImagen(page, directorioDestino, i);

                  // Navegar a la siguiente página si es necesario
                  if (i < totalPaginas) {
                    await page.waitForSelector("#j_idt130\\:_t144", {
                      timeout: 10000,
                    });
                    await page.click("#j_idt130\\:_t144");
                    await page.waitForTimeout(1000); //Ajusta el tiempo segun sea necesario
                  }
                }

                //Cerrar el libro
                await page.waitForSelector("#j_idt167\\:_t168", {
                  timeout: 10000,
                });
                await page.click("#j_idt167\\:_t168");
              } catch (error) {
                console.error("No se encontro el libro: ", error);

                //Cerrar el modal 'Error del sistema'
                try {
                  await page.waitForSelector(".modal-footer ", {
                    timeout: 10000,
                  });
                  await page.click(
                    '.modal-footer .btn.btn-default[data-dismiss="modal"]'
                  );

                  // Espera opcional para ver el resultado
                  await page.waitForTimeout(2000);
                } catch (error) {
                  console.error(error);
                }
              }
            } catch (error) {
              console.error("Error en el proceso de scraping:", error);
            } finally {
              //Cerrar el navegador en cada libro
              await browser.close();
            }
          }
        }

        //Salir de la categoria
        await page.waitForSelector("#j_idt16\\:_t24", { timeout: 10000 });
        await page.click("#j_idt16\\:_t24");
      }
    }
  } catch (error) {
    console.error("Error en el proceso de scraping:", error);
  } finally {
    //Cerrar el navegador
    await browser.close();
  }
};

extractor();
