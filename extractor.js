const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { table, group } = require("console");
const { type } = require("os");

//URL y selectores
const URL =
  "http://sij.usfx.bo/elibro/principal.usfx?cu=null&ca=INV&idLibro=null";
const diplomado = "#j_idt16\\:j_idt107\\:0\\:_t110";
const diplomadosSelector = '[id^="j_idt16:j_idt107:"][id$=":_t110"]';
/**#############################################################*/
let categoriaBuscar = "Agronomia";
// const selectorPagina = "#j_idt16\\:j_idt68\\:0\\:_t70";

/**#############################################################*/
const librosSelector = "[id^='j_idt16:j_idt49:'][id$=':_t55']";
const selectorPaginaciones = '[id^="j_idt16:j_idt68:"][id$=":_t70"]';

//Funcion para obtener el total de paginaciones
const obtenerTotalPaginaciones = async (page, selectorPaginacion) => {
  try {
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
    console.log("No hay paginaciones: ", error);
    return false;
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
    await page.waitForSelector(".documentPageView img", { timeout: 10000 });
    const imagen = await page.$(".documentPageView img");
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

    //Esperar y extraer todos los titulos de los diplomados
    await page.waitForSelector(diplomadosSelector, { timeout: 10000 });
    const titulosDiplomados = await page.$$eval(
      diplomadosSelector,
      (elements) =>
        elements
          .map((el) => el.textContent.trim().toLowerCase())
          .filter((text) => text.includes("diplomado"))
    );

    console.table(titulosDiplomados);
    console.table(titulosDiplomados.length);

    //Esperar y extraer todos los titulos del total de libros
    await page.waitForSelector(diplomadosSelector, { timeout: 10000 });
    const titulosTotalLibros = await page.$$eval(
      diplomadosSelector,
      (elements) => elements.map((el) => el.textContent.trim().toLowerCase())
    );

    console.table(titulosTotalLibros);
    console.table(titulosTotalLibros.length);

    //Iterar sobre los diplomados para hacer click en la categoria buscada
    for (let i = 0; i < titulosTotalLibros.length; i++) {
      const selectorCategoria = `#j_idt16\\:j_idt107\\:${i}\\:_t110`;

      //Esperar por el selector de la categoria y obtener su texto
      await page.waitForSelector(selectorCategoria, { timeout: 10000 });
      const tituloCategoria = await page.$eval(selectorCategoria, (element) =>
        element.textContent.trim().toLowerCase()
      );

      categoriaBuscar = categoriaBuscar.trim().toLowerCase();

      console.log("titulo categoria buscar: ", categoriaBuscar);
      console.log("titulo categoria : ", tituloCategoria);

      if (tituloCategoria === categoriaBuscar) {
        const flag = i;
        //hace click en la categoria indicada
        await page.waitForSelector(`#j_idt16\\:j_idt107\\:${i}\\:_t108`, {
          timeout: 10000,
        });
        await page.click(`#j_idt16\\:j_idt107\\:${i}\\:_t108`);

        // Espera opcional para ver el resultado
        await page.waitForTimeout(3000);

        //Obtener el total de paginaciones
        let totalPaginaciones = await obtenerTotalPaginaciones(
          page,
          selectorPaginaciones
        );

        if (totalPaginaciones === false) {
          totalPaginaciones = 1;
        }

        for (let j = 0; j < totalPaginaciones; j++) {
          //hace click en la paginacion
          await page.waitForSelector(`#j_idt16\\:j_idt68\\:${j}\\:_t70`, {
            timeout: 10000,
          });
          await page.click(`#j_idt16\\:j_idt68\\:${j}\\:_t70`);

          // Espera opcional para ver el resultado
          await page.waitForTimeout(3000);

          // /***** ###### Explorar # paginaciones cambiar el digito  ###### ****** */
          // try {
          //   await page.waitForSelector(selectorPagina, {
          //     timeout: 10000,
          //   });
          //   await page.click(selectorPagina);

          //   // Espera opcional para ver el resultado
          //   await page.waitForTimeout(3000);
          // } catch (error) {
          //   console.log(error);
          // }
          // /***** ###### ###################### ###### ****** */

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
                await page.waitForTimeout(3000);
              } catch (error) {
                console.log(error);
              }

              /***** ###### Explorar # paginas cambiar el digito  ###### ****** */
              try {
                //hace click en la paginacion
                await page.waitForSelector(`#j_idt16\\:j_idt68\\:${j}\\:_t70`, {
                  timeout: 10000,
                });
                await page.click(`#j_idt16\\:j_idt68\\:${j}\\:_t70`);

                // Espera opcional para ver el resultado
                await page.waitForTimeout(3000);

                // await page.waitForSelector(selectorPagina, {
                //   timeout: 10000,
                // });
                // await page.click(selectorPagina);

                // // Espera opcional para ver el resultado
                // await page.waitForTimeout(3000);
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
                await page.waitForTimeout(3000);

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
                  await page.waitForTimeout(3000);
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
