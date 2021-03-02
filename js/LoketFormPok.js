var socket = io();

$(document).ready(function() {
    $("#loketProgram").change(function() {
        if ($("#loketProgram").val() != "Pilih Program") {
            console.log($("#loketProgram").val())
            socket.emit('mintaKegiatan', $("#loketProgram").val())
        } else {
            $("#loketKegiatan").empty().append('<option selected>Pilih Kegiatan</option>')
            $("#loketOutput").empty().append('<option selected>Pilih Output</option>')
            $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok").empty().append('<option selected>Pilih Detail</option>')
        }
    })
    $("#loketKegiatan").change(function() {
        if ($("#loketKegiatan").val() != "Pilih Kegiatan") {
            console.log($("#loketKegiatan").val())
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val()]
            socket.emit('mintaOutput', s)
        } else {
            $("#loketOutput").empty().append('<option selected>Pilih Output</option>')
            $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok").empty().append('<option selected>Pilih Detail</option>')
        }
    })
    $("#loketOutput").change(function() {
        if ($("#loketOutput").val() != "Pilih Output") {
            console.log($("#loketOutput").val())
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val()]
            socket.emit('mintaKomponen', s)
        } else {
            $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok").empty().append('<option selected>Pilih Detail</option>')
        }
    })
    $("#loketKomponen").change(function() {
        if ($("#loketKomponen").val() != "Pilih Komponen") {
            console.log($("#loketKomponen").val())
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val(), $("#loketKomponen").val()]
            socket.emit('mintaAkun', s)
        } else {
            $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
            $("#loketDetailPok").empty().append('<option selected>Pilih Detail</option>')
        }
    })
    $("#loketAkun").change(function() {
        if ($("#loketAkun").val() != "Pilih Akun") {
            console.log($("#loketAkun").val())
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val(), $("#loketKomponen").val(), $("#loketAkun").val()]
            socket.emit('mintaDetailPok', s)
        } else { $("#loketDetailPok").empty().append('<option selected>Pilih Detail</option>') }
    })
    $("#loketDetailPok").change(function() {
        if ($("#loketDetailPok").val() != "Pilih Detail") {
            let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val(), $("#loketKomponen").val(), $("#loketAkun").val(), $("#loketDetailPok").val()]
            socket.emit('cekPagudetail', s)
        }
    })
    if ($("#loketDetailPok").val() != "Pilih Detail") {
        let s = [$("#loketProgram").val(), $("#loketKegiatan").val(), $("#loketOutput").val(), $("#loketKomponen").val(), $("#loketAkun").val(), $("#loketDetailPok").val()]
        socket.emit('cekPagudetail', s)
    }

    socket.on('terimaKegiatan', function(kegiatan) {
        let sama = false
        $("#loketKegiatan").empty().append('<option selected>Pilih Kegiatan</option>')
        for (let i = 0; i < kegiatan.length; i++) {
            $('#loketKegiatan option').each(function() { if (kegiatan[i].kdgiat == this.value) sama = true })
            if (!sama) {
                let s = '<option value="' + kegiatan[i].kdgiat + '">' + kegiatan[i].kdgiat + ' ' + kegiatan[i].uraian + '</option>'
                $("#loketKegiatan").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaOutput', function(output) {
        let sama = false
        $("#loketOutput").empty().append('<option selected>Pilih Output</option>')
        for (let i = 0; i < output.length; i++) {
            $('#loketOutput option').each(function() { if (output[i].kdoutput == this.value) sama = true })
            if (!sama) {
                let s = '<option value="' + output[i].kdoutput + '">' + output[i].kdoutput + ' ' + output[i].uraian + '</option>'
                $("#loketOutput").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaKomponen', function(komponen) {
        let sama = false
        $("#loketKomponen").empty().append('<option selected>Pilih Komponen</option>')
        for (let i = 0; i < komponen.length; i++) {
            $('#loketKomponen option').each(function() { if (komponen[i].kdkmpnen == this.value) sama = true })
            if (!sama) {
                let s = '<option value="' + komponen[i].kdkmpnen + '">' + komponen[i].kdkmpnen + ' ' + komponen[i].urkmpnen + '</option>'
                $("#loketKomponen").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaAkun', function(akun) {
        let sama = false
        $("#loketAkun").empty().append('<option selected>Pilih Akun</option>')
        for (let i = 0; i < akun.length; i++) {
            $('#loketAkun option').each(function() { if (akun[i].kdakun == this.value) sama = true })
            if (!sama) {
                let s = '<option value="' + akun[i].kdakun + '">' + akun[i].kdakun + ' ' + akun[i].uraian + '</option>'
                $("#loketAkun").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaDetailPok', function(detail) {
        let sama = false
        $("#loketDetailPok").empty().append('<option selected>Pilih Detail</option>')
        for (let i = 0; i < detail.length; i++) {
            $('#loketDetailPok option').each(function() { if (detail[i].nmitem == this.value) sama = true })
            if (!sama) {
                let s = '<option value="' + detail[i].nmitem + '">' + detail[i].nmitem + '</option>'
                $("#loketDetailPok").append(s)
            }
            sama = false
        }
    })
    socket.on('terimaPaguDetail', function(pagu) {
        if (pagu < $("#loketNilai").val()) {
            let sel = pagu - $("#loketNilai").val()
            $("#pokWarning").html('<p style="color: red; font-size: 13pt"><strong>POK TIDAK CUKUP!</strong> (Rp ' + sel + ')</p>')
        } else {
            $("#pokWarning").html('')
        }
    })
});

function formatTanggal(date) {
    let monthNames = [
        "Januari", "Februari", "Maret",
        "April", "Mei", "Juni", "Juli",
        "Agustus", "September", "Oktober",
        "November", "Desember"
    ];
    let day = date.getDate();
    let monthIndex = date.getMonth();
    let year = date.getFullYear();
    return day + ' ' + monthNames[monthIndex] + ' ' + year;
};

function generalAlert(message) {
    $.toast({
        text: message,
        textAlign: 'left',
        hideAfter: 5000,
        loader: false,
        position: 'bottom-right',
        stack: 2
    })
}