import { io } from "socket.io-client";

const teacher = io("http://localhost:3000", {
  path: "/socket.io",
  transports: ["websocket"],
});

function fail(err) {
  console.error(err);
  process.exit(1);
}

teacher.on("connect_error", fail);
setTimeout(() => fail("timeout"), 10000);

teacher.on("connect", () => {
  teacher.emit("teacher:create", { page: "intro" }, (res) => {
    console.log("teacher", res);
    const code = res.room.code;
    const student = io("http://localhost:3000", {
      path: "/socket.io",
      transports: ["websocket"],
    });
    student.on("connect_error", fail);
    student.on("connect", () => {
      student.emit(
        "student:join",
        { code, name: "테스트", studentId: "s_test1" },
        (r) => {
          console.log("student", r);
          student.emit("student:hand", { raised: true });
          student.emit("presence:page", { page: "s0201" });
          setTimeout(() => {
            teacher.emit("teacher:focus", { enabled: true }, (fr) => {
              console.log("focus", fr);
              setTimeout(() => {
                teacher.close();
                student.close();
                console.log("done");
                process.exit(0);
              }, 400);
            });
          }, 300);
        },
      );
    });
  });
});
