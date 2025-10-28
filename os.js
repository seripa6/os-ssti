const scriptURL = "https://script.google.com/macros/s/AKfycbwU-jFQYWb6NdnMgxyNGtUaB9UFD1rXbdYgQ_fNlOucruEc6jW7oofUWObFGgWkpS-J/exec"; // Substitua pelo seu ID do Apps Script
const sheetId = "1XOYUgRgRPgN82-j_mabDaoLz68gRKt--IbJUjz0l4C4";
const aba = "registros";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formOS");
    let enviando = false;

    // Identifica o tipo de registro
    const tipoRegistro = document.title.includes("OS - SSTI") ? "os" :
        document.title.includes("resposta") ? "resposta" : "";

    // Atualiza L3/M3 e numeroChamado ao carregar
    atualizarBuscar();

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (enviando) return;
            enviando = true;

            const botao = form.querySelector('button[type="submit"]');
            if (botao) botao.disabled = true;

            const dados = new FormData(form);
            dados.append("tipo", tipoRegistro);

            // Adiciona numeroChamado
            const numeroChamado = document.getElementById("numeroChamado").textContent;
            dados.append("numeroChamado", numeroChamado);

            // Converte arquivo para Base64
            const arquivoInput = form.querySelector('input[type="file"]');
            if (arquivoInput && arquivoInput.files.length > 0) {
                const file = arquivoInput.files[0];
                try {
                    const base64 = await arquivoToBase64(file);
                    dados.set("arquivo", base64.split(",")[1]); // Base64 puro
                    dados.set("nomeArquivo", file.name);
                    dados.set("tipoArquivo", file.type || "application/octet-stream");
                } catch (err) {
                    console.error("Erro ao ler arquivo:", err);
                    alert("Erro ao processar o arquivo. Tente novamente.");
                    enviando = false;
                    if (botao) botao.disabled = false;
                    return;
                }
            }

            // Envia para o Apps Script
            try {
                // Tenta enviar os dados
                await fetch(scriptURL, {
                    method: "POST",
                    body: dados,
                    mode: "cors",
                    credentials: "omit"
                });
            } catch (err) {
                // Ignora erros de CORS ou outros
                console.error("❌ Erro no envio (ignorado):", err);
            } finally {
                // Sempre executa essas ações
                enviando = false;
                if (botao) botao.disabled = false;
                form.reset();
                document.getElementById("outroMotivo").style.display = "none";
                atualizarBuscar();

                // Redireciona independente de erro
                window.location.href = "registrado.html";
            }
        });
    }
});

function checkOutro() {
    const select = document.getElementById("motivo");
    const inputOutro = document.getElementById("outroMotivo");
    if (select.value === "Outro") {
        inputOutro.style.display = "block";
        inputOutro.required = true;
    } else {
        inputOutro.style.display = "none";
        inputOutro.required = false;
    }
}

function arquivoToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Busca célula específica via gviz/tq
function buscarCelula(celula, callback) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${aba}&range=${celula}`;
    fetch(url)
        .then(res => res.text())
        .then(text => {
            const json = JSON.parse(text.substr(47).slice(0, -2));
            const valor = json.table.rows[0]?.c[0]?.v || "0";
            callback(valor);
        })
        .catch(() => callback("0"));
}

function atualizarBuscar() {
    buscarCelula("L3", valor => {
        document.getElementById("valorL3").textContent = valor;
        atualizarNumeroChamado();
    });
}

// ====================== Calcula numeroChamado ======================
function atualizarNumeroChamado() {
    const spanL3 = document.getElementById("valorL3");
    const numeroChamadoDiv = document.getElementById("numeroChamado");

    let valorL3 = spanL3.textContent || "0000/2025";
    let [numeroStr, ano] = valorL3.split("/");
    let numero = parseInt(numeroStr, 10) || 0;
    numero += 1;
    let novoNumeroStr = numero.toString().padStart(4, "0");

    numeroChamadoDiv.textContent = `${novoNumeroStr}/${ano}`;
}