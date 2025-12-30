
// Utilitário para lidar com CSVs no Frontend

export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
    if (!data || !data.length) {
        alert("Não há dados para exportar.");
        return;
    }

    // Se headers não forem fornecidos, usa as chaves do primeiro objeto
    const columns = headers || Object.keys(data[0]);
    
    const csvContent = [
        columns.join(','), // Cabeçalho
        ...data.map(row => 
            columns.map(fieldName => {
                let value = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName];
                // Escapar aspas e envolver strings com vírgulas
                if (typeof value === 'string') {
                    value = `"${value.replace(/"/g, '""')}"`; 
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return resolve([]);

            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) return resolve([]); // Só cabeçalho ou vazio

            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
            
            const result = lines.slice(1).map(line => {
                // Regex complexo para lidar com vírgulas dentro de aspas
                const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
                const obj: any = {};
                
                headers.forEach((header, index) => {
                    let val = values[index] || '';
                    // Limpar aspas extras da formatação CSV
                    val = val.replace(/^"|"$/g, '').replace(/""/g, '"');
                    obj[header] = val;
                });
                return obj;
            });
            resolve(result);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
};
